/**
 * Shared shapes for the checkout flow: turning the local cart (lib/cart.ts) into a
 * real BLAZE ECOM order. See blaze-checkout-client.ts for the HTTP layer and
 * replay.ts for the orchestration that produces a CheckoutResult.
 */

export interface CheckoutContact {
  name: string;
  phone: string;
  email: string;
}

/** What the client posts for each cart line. Deliberately does NOT include price —
 * BLAZE ECOM is the source of truth for pricing; the server resolves it fresh via
 * `slug` rather than trusting a client-supplied amount. */
export interface CheckoutLineInput {
  slug: string;
  name: string;
  qty: number;
}

export interface CheckoutRequestBody {
  contact: CheckoutContact;
  lines: CheckoutLineInput[];
}

/**
 * The three failure categories the design calls for, plus success. `pending` is a
 * flag on `api_error`, not a fifth top-level status: BLAZE ECOM's order submission is
 * asynchronous (see replay.ts), and if it hasn't reached a terminal state by the time
 * we stop polling, that is honestly "we don't know yet" rather than a clean failure —
 * still surfaced as "unexpected" to the customer (per the design's three states) but
 * with wording that doesn't claim the order definitely failed.
 */
export type CheckoutResult =
  | { status: 'ok'; orderNumber: string; cartUuid: string; totalCents: number | null }
  | { status: 'validation_failed'; message: string }
  | { status: 'network_error'; message: string }
  | { status: 'api_error'; message: string; cartUuid?: string; pending?: boolean };
