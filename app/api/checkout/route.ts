import { NextResponse } from 'next/server';
import { getBlazeEcomConfig, getCatalogMode } from '@/lib/catalog';
import { BlazeCheckoutClient } from '@/lib/checkout/blaze-checkout-client';
import { replayCartToOrder } from '@/lib/checkout/replay';
import type { CheckoutRequestBody, CheckoutResult } from '@/lib/checkout/types';

/**
 * The only place a BLAZE ECOM base URL, store UUID, or (in a later phase) payment
 * credential is allowed to be used — this is a server route handler, never shipped to
 * the browser bundle. The client posts its already-built local cart lines and contact
 * details here; this route replays them into a real BLAZE cart and order.
 *
 * Only reachable in `CATALOG_SOURCE=blaze` mode. In mock mode the client never calls
 * this route at all (see CartProvider's `catalogMode`/CheckoutFlow) — this 400 is a
 * defensive backstop, not the primary mode switch.
 */
export async function POST(request: Request): Promise<NextResponse<CheckoutResult>> {
  if (getCatalogMode() !== 'blaze') {
    return NextResponse.json(
      { status: 'api_error', message: 'Live checkout is not enabled for this deployment.' },
      { status: 400 },
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ status: 'api_error', message: 'Could not read the checkout request.' }, { status: 400 });
  }

  if (!body?.contact?.name || !body.contact.phone || !body.contact.email) {
    return NextResponse.json({ status: 'validation_failed', message: 'Name, phone, and email are required.' }, { status: 422 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ status: 'validation_failed', message: 'Your cart is empty.' }, { status: 422 });
  }

  const { baseUrl, storeUuid } = getBlazeEcomConfig();
  const client = new BlazeCheckoutClient({ baseUrl, storeUuid });

  const result = await replayCartToOrder({ contact: body.contact, lines: body.lines }, client);

  const httpStatus = result.status === 'ok' ? 200 : result.status === 'validation_failed' ? 422 : 502;
  return NextResponse.json(result, { status: httpStatus });
}
