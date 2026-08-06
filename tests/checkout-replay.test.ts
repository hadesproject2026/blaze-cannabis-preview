import { describe, expect, it } from 'vitest';
import { BlazeCheckoutClient } from '@/lib/checkout/blaze-checkout-client';
import { replayCartToOrder } from '@/lib/checkout/replay';
import type { CheckoutLineInput } from '@/lib/checkout/types';

import productDetail490 from './fixtures/blaze-product-detail.json';
import productDetail505 from './fixtures/checkout/product-detail-505.json';
import createCartSuccess from './fixtures/checkout/create-cart-success.json';
import addItemSuccess from './fixtures/checkout/add-item-success.json';
import addItemOutOfStock from './fixtures/checkout/add-item-out-of-stock.json';
import deliverySpecSuccess from './fixtures/checkout/delivery-spec-success.json';
import validateSuccess from './fixtures/checkout/validate-success.json';
import validateMinimumNotMet from './fixtures/checkout/validate-minimum-not-met.json';
import submitOrderPending from './fixtures/checkout/submit-order-pending.json';
import submissionProcessing from './fixtures/checkout/submission-processing.json';
import submissionFailed from './fixtures/checkout/submission-failed.json';
import submissionDone from './fixtures/checkout/submission-done.json';
import findOrderByCart from './fixtures/checkout/find-order-by-cart.json';
import orderDetail from './fixtures/checkout/order-detail.json';

// These fixtures are a mix of trimmed REAL captures against
// https://ecom-api.staging.blaze.me (store e87437f2-3e35-4738-af5e-6307e368255c) taken
// 2026-08-06, and a small number of clearly-labeled synthetic fixtures (each carries a
// `__synthetic__` field explaining why) for branches live testing could not reach —
// most notably the "done" submission outcome, since three separate live attempts all
// ended in "failed" instead. See .superpowers/sdd/live-phase2-report.md for the full
// trace, including the exact 3-for-3 reproduction of the real failure captured
// verbatim in submission-failed.json.

const BASE_URL = 'https://ecom-api.staging.blaze.me';
const STORE_UUID = 'e87437f2-3e35-4738-af5e-6307e368255c';

interface FixtureResponse {
  status: number;
  body: unknown;
}

/** A fetchImpl stand-in that returns canned fixture responses in call order,
 * ignoring the URL/method — safe here because replayCartToOrder always calls BLAZE
 * ECOM in one fixed, deterministic sequence (see replay.ts). Throws if the code under
 * test makes more calls than the test wired up, so an unexpected extra request fails
 * loudly instead of silently returning undefined. */
function sequenceFetch(responses: FixtureResponse[]): typeof fetch {
  let index = 0;
  return (async () => {
    if (index >= responses.length) {
      throw new Error(`sequenceFetch: unexpected call #${index + 1} — only ${responses.length} responses configured`);
    }
    const { status, body } = responses[index];
    index += 1;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/vnd.api+json' } });
  }) as typeof fetch;
}

function ok(body: unknown, status = 200): FixtureResponse {
  return { status, body };
}
function fail(body: unknown, status: number): FixtureResponse {
  return { status, body };
}

function makeClient(fetchImpl: typeof fetch): BlazeCheckoutClient {
  return new BlazeCheckoutClient({
    baseUrl: BASE_URL,
    storeUuid: STORE_UUID,
    fetchImpl,
    pollIntervalMs: 5,
    pollTimeoutMs: 200,
  });
}

const twoLineCart: CheckoutLineInput[] = [
  { slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 },
  { slug: 'sour-diesel-505', name: 'Sour Diesel', qty: 2 },
];

const contact = { name: 'Jamie Rivera', phone: '905-555-0102', email: 'jamie@example.com' };

describe('replayCartToOrder — request shapes', () => {
  it('sends the real, live-verified request shapes, not the published-docs shapes that were tried and rejected', async () => {
    const calls: { path: string; method: string; body: unknown; headers: Record<string, string> }[] = [];
    const responses: FixtureResponse[] = [
      ok(productDetail490),
      ok(createCartSuccess, 201),
      ok(deliverySpecSuccess),
      ok(validateSuccess),
      ok(submitOrderPending),
      ok(submissionDone),
      ok(findOrderByCart),
      ok(orderDetail),
    ];
    let index = 0;
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({
        path: url.replace(BASE_URL, ''),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(init.body as string) : undefined,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
      });
      const { status, body } = responses[index];
      index += 1;
      return new Response(JSON.stringify(body), { status });
    }) as typeof fetch;

    await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    // Create cart: delivery_specification is a nested object ({type: "pickup"}), NOT
    // the bare string the published docs show — that string shape is rejected live
    // with "invalid_delivery_specification".
    expect(calls[1]).toMatchObject({
      path: '/api/v5/carts',
      method: 'POST',
      body: {
        data: {
          type: 'carts',
          attributes: {
            delivery_specification: { type: 'pickup' },
            inventory_type: 'recreational',
            item: { product_id: '490', quantity: 1 },
          },
        },
      },
    });

    // Delivery-specification PUT: addresses the cart resource directly
    // (`type: "carts"`), NOT `type: "delivery_specifications"` as published — that
    // shape is rejected live with "Missing type in data parameter".
    expect(calls[2]).toMatchObject({
      path: '/api/v4/carts/3f6f9d4b-4787-45f7-80f7-7e730782e49d/delivery-specification',
      method: 'PUT',
      body: { data: { type: 'carts', id: '3f6f9d4b-4787-45f7-80f7-7e730782e49d', attributes: { type: 'pickup', mode: 'asap' } } },
    });

    expect(calls[4]).toMatchObject({ path: '/api/v5/orders', method: 'POST', body: { data: { attributes: { cart_uuid: '3f6f9d4b-4787-45f7-80f7-7e730782e49d' } } } });

    // Every request identifies the store via X-Store and speaks JSON:API — the same
    // conventions Phase 1's BlazeEcomCatalogSource uses — and none carries any kind
    // of Authorization/credential header, matching "guest checkout only" for this
    // phase (no account, no token — payment/auth is explicitly Phase 3).
    for (const call of calls) {
      expect(call.headers['x-store']).toBe(STORE_UUID);
      expect(call.headers['content-type']).toBe('application/vnd.api+json');
      expect(call.headers.authorization).toBeUndefined();
    }
  });
});

describe('replayCartToOrder — happy path', () => {
  it('replays a multi-line cart through the full real sequence to a completed order', async () => {
    const fetchImpl = sequenceFetch([
      ok(productDetail490), // resolve slug 1 -> numeric id 490
      ok(productDetail505), // resolve slug 2 -> numeric id 505
      ok(createCartSuccess, 201), // POST /carts (first item)
      ok(addItemSuccess, 201), // POST /carts/{id}/items (second item)
      ok(deliverySpecSuccess), // PUT delivery-specification
      ok(validateSuccess), // POST /valid
      ok(submitOrderPending), // POST /orders (kicks off async submission)
      ok(submissionProcessing), // poll 1
      ok(submissionDone), // poll 2 (synthetic — see file header)
      ok(findOrderByCart), // GET /carts/{id}/order (synthetic)
      ok(orderDetail), // GET /orders/{id} (synthetic)
    ]);

    const result = await replayCartToOrder({ contact, lines: twoLineCart }, makeClient(fetchImpl));

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.cartUuid).toBe('3f6f9d4b-4787-45f7-80f7-7e730782e49d');
      // order-detail.json deliberately omits order_number/number to exercise the
      // uuid fallback in BlazeCheckoutClient.getOrder().
      expect(result.orderNumber).toBe('8a1c1e2b-7f3d-4a6e-9c0a-1b2c3d4e5f60');
      // validate-success.json's real captured total (17020 = $170.20), not
      // order-detail.json's synthetic one — confirms totalCents comes from the order
      // read-back, and that it's treated as already-cents like every other money
      // field in this API.
      expect(result.totalCents).toBe(17020);
    }
  });
});

describe('replayCartToOrder — validation failures', () => {
  it('maps a real product_out_of_stock error (from adding the second item) to validation_failed', async () => {
    const fetchImpl = sequenceFetch([
      ok(productDetail490),
      ok(productDetail505),
      ok(createCartSuccess, 201),
      fail(addItemOutOfStock, 400), // real captured error, reproduced 1:1 live
    ]);

    const result = await replayCartToOrder({ contact, lines: twoLineCart }, makeClient(fetchImpl));

    expect(result.status).toBe('validation_failed');
    if (result.status === 'validation_failed') {
      expect(result.message).toContain('Grandaddy Purple');
    }
  });

  it('maps any /valid failure to validation_failed regardless of error code, since that endpoint IS the validation step', async () => {
    const fetchImpl = sequenceFetch([
      ok(productDetail490),
      ok(createCartSuccess, 201),
      ok(deliverySpecSuccess),
      fail(validateMinimumNotMet, 422), // synthetic — see file header
    ]);

    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    expect(result.status).toBe('validation_failed');
    if (result.status === 'validation_failed') {
      expect(result.message).toContain('order minimum');
    }
  });

  it('reports an empty cart as validation_failed without making any request', async () => {
    const fetchImpl = sequenceFetch([]); // any call here throws — proves no network happens
    const result = await replayCartToOrder({ contact, lines: [] }, makeClient(fetchImpl));
    expect(result).toEqual({ status: 'validation_failed', message: 'Your cart is empty.' });
  });

  it('reports a removed/unknown product (404 on lookup) as validation_failed, naming the item', async () => {
    const fetchImpl = sequenceFetch([
      fail({ errors: [{ code: 'not_found', status: 404, detail: 'Not found.' }] }, 404),
    ]);
    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'discontinued-item', name: 'Discontinued Item', qty: 1 }] },
      makeClient(fetchImpl),
    );
    expect(result).toEqual({ status: 'validation_failed', message: 'Discontinued Item is no longer available.' });
  });
});

describe('replayCartToOrder — network failure', () => {
  it('maps a thrown fetch (offline/DNS/connection refused) to network_error, distinctly from an API error', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;

    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    expect(result.status).toBe('network_error');
  });
});

describe('replayCartToOrder — unexpected API errors', () => {
  it('maps the REAL captured order-submission failure to api_error with the store-provided detail', async () => {
    // This is the actual failure observed live, verbatim, on three separate
    // attempts against the staging demo store — see submission-failed.json and the
    // phase report. Not synthetic.
    const fetchImpl = sequenceFetch([
      ok(productDetail490),
      ok(createCartSuccess, 201),
      ok(deliverySpecSuccess),
      ok(validateSuccess),
      ok(submitOrderPending),
      ok(submissionFailed), // terminal "failed" on the very first poll
    ]);

    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    expect(result.status).toBe('api_error');
    if (result.status === 'api_error') {
      expect(result.message).toBe('Unexpected error communicating with the store.');
      expect(result.pending).toBeFalsy();
      expect(result.cartUuid).toBe('3f6f9d4b-4787-45f7-80f7-7e730782e49d');
    }
  });

  it('reports a still-processing submission at the poll timeout as api_error with pending:true, never as success or hard failure', async () => {
    const fetchImpl = sequenceFetch([
      ok(productDetail490),
      ok(createCartSuccess, 201),
      ok(deliverySpecSuccess),
      ok(validateSuccess),
      ok(submitOrderPending),
      // "processing" forever — pollTimeoutMs (200ms) / pollIntervalMs (5ms) gives
      // room for many polls; supply enough to outlast the timeout.
      ...Array.from({ length: 60 }, () => ok(submissionProcessing)),
    ]);

    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    expect(result.status).toBe('api_error');
    if (result.status === 'api_error') {
      expect(result.pending).toBe(true);
      expect(result.cartUuid).toBe('3f6f9d4b-4787-45f7-80f7-7e730782e49d');
    }
  });

  it('maps an invalid_product_id-shaped error (our own bug, not a customer-fixable cart problem) to api_error, not validation_failed', async () => {
    // Real captured shape from testing the create-cart request format live (before
    // discovering the correct nested delivery_specification shape) — kept as
    // evidence that a malformed-request error must NOT be shown to a customer as
    // "your cart has a problem", since there is nothing they could do about it.
    const fetchImpl = sequenceFetch([
      ok(productDetail490),
      fail(
        { errors: [{ code: 'invalid_product_id', status: 422, fields: ['product_id'], detail: 'Product id is invalid' }] },
        422,
      ),
    ]);

    const result = await replayCartToOrder(
      { contact, lines: [{ slug: 'honeyshot-buzz-490', name: 'HoneyShot Buzz', qty: 1 }] },
      makeClient(fetchImpl),
    );

    expect(result.status).toBe('api_error');
  });
});
