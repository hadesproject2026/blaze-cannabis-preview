/**
 * Orchestrates turning the local cart into a real BLAZE ECOM order: create cart, add
 * remaining lines, set pickup, validate, submit, poll for completion, read back the
 * order. The local cart itself (lib/cart.ts) is untouched — this only *replays* its
 * already-built lines at checkout time, per the phase design ("the local cart stays
 * exactly as it is... on checkout it is replayed into a BLAZE cart").
 *
 * Every error path is mapped onto exactly one of the three customer-facing failure
 * categories the design calls for (validation / network / unexpected-API), so a
 * caller always gets a definite, presentable result — never an uncaught throw. See
 * types.ts for the CheckoutResult shape and its reasoning.
 */

import { BlazeApiError, BlazeCheckoutClient, BlazeNetworkError } from './blaze-checkout-client';
import type { CheckoutContact, CheckoutLineInput, CheckoutResult } from './types';

/** Error codes from BLAZE's `errors[].code` that represent a genuine, customer-facing
 * cart problem (stock, minimums) rather than a malformed request on our end. Extend
 * this list if a real minimum-order or scheduling error code is observed — none was
 * during Phase 2 testing (only product_out_of_stock was ever produced live); an
 * unrecognized code is treated as `api_error` rather than silently mis-attributed to
 * the customer's cart, since that would give a customer a confusing "your cart has
 * a problem" message with no problem they can actually see or fix. */
const VALIDATION_ERROR_CODES = new Set([
  'product_out_of_stock',
  'insufficient_inventory',
  'cart_minimum',
  'cart_minimum_not_met',
  'order_minimum',
  'minimum_order_not_met',
]);

function firstDetail(errors: { detail?: string; code?: string }[], fallback: string): string {
  return errors.find((e) => e.detail)?.detail ?? fallback;
}

export interface ReplayInput {
  contact: CheckoutContact;
  lines: CheckoutLineInput[];
}

export async function replayCartToOrder(input: ReplayInput, client: BlazeCheckoutClient): Promise<CheckoutResult> {
  const lines = input.lines.filter((line) => line.qty > 0);
  if (lines.length === 0) {
    return { status: 'validation_failed', message: 'Your cart is empty.' };
  }

  try {
    // Resolve every line's BLAZE-internal numeric product id up front (see
    // BlazeCheckoutClient.resolveProductId for why this lookup is necessary), so a
    // removed/renamed product is reported clearly rather than surfacing mid-replay.
    const resolvedLines: { productId: string; name: string; qty: number }[] = [];
    for (const line of lines) {
      const productId = await client.resolveProductId(line.slug);
      if (!productId) {
        return { status: 'validation_failed', message: `${line.name} is no longer available.` };
      }
      resolvedLines.push({ productId, name: line.name, qty: line.qty });
    }

    const [first, ...rest] = resolvedLines;
    const { cartUuid } = await client.createCart({ productId: first.productId, quantity: first.qty });

    for (const line of rest) {
      await client.addItem(cartUuid, { productId: line.productId, quantity: line.qty });
    }

    await client.setPickup(cartUuid);

    // /valid exists specifically to check "stock availability, pricing, delivery
    // eligibility, order minimums, promo codes, and schedule availability" (per
    // BLAZE's own docs) — so unlike the generic error handling below, ANY failure
    // from this specific step is treated as a validation failure, not just ones
    // matching a known code. A network failure still needs to surface as
    // network_error, so it's re-thrown for the outer catch to handle.
    try {
      await client.validateCart(cartUuid);
    } catch (error) {
      if (error instanceof BlazeApiError) {
        return { status: 'validation_failed', message: firstDetail(error.errors, 'This cart could not be validated.') };
      }
      throw error;
    }

    await client.submitOrder(cartUuid);

    const final = await client.pollForSubmission(cartUuid);

    if (final.status === 'failed') {
      return {
        status: 'api_error',
        cartUuid,
        message: firstDetail(final.errors, 'The store could not process this order.'),
      };
    }

    if (final.status !== 'done') {
      // Timed out without a terminal state. Genuinely unknown — do not claim success
      // or failure (see types.ts's CheckoutResult doc comment).
      return {
        status: 'api_error',
        cartUuid,
        pending: true,
        message: "We're still confirming this order with the store. Please check back shortly.",
      };
    }

    const orderUuid = (await client.findOrderUuidByCart(cartUuid)) ?? cartUuid;
    const order = await client.getOrder(orderUuid);
    return { status: 'ok', orderNumber: order.orderNumber, cartUuid, totalCents: order.totalCents };
  } catch (error) {
    if (error instanceof BlazeNetworkError) {
      return { status: 'network_error', message: 'We could not reach the store. Nothing was ordered — please try again.' };
    }
    if (error instanceof BlazeApiError) {
      const isValidationShaped = error.errors.some((e) => e.code && VALIDATION_ERROR_CODES.has(e.code));
      if (isValidationShaped) {
        return { status: 'validation_failed', message: firstDetail(error.errors, 'This cart could not be validated.') };
      }
      return { status: 'api_error', message: firstDetail(error.errors, 'Something went wrong placing this order.') };
    }
    return { status: 'api_error', message: 'Something unexpected happened placing this order.' };
  }
}
