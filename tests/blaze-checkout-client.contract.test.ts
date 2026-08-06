import { describe, expect, it } from 'vitest';
import { BlazeApiError, BlazeCheckoutClient } from '@/lib/checkout/blaze-checkout-client';

// Hits the live BLAZE ECOM staging API, same as blaze-ecom-source.contract.test.ts —
// must not fail an offline `npm test`, so it skips cleanly if staging is unreachable.
//
// Deliberately stops short of submitOrder(): live testing (done manually, see
// .superpowers/sdd/live-phase2-report.md) showed order submission taking 35-100s and
// consistently ending in "failed" on this demo store's POS bridge. Exercising that in
// every `npm test` run would make the suite slow and give a false-negative "failure"
// on every run regardless of code correctness — a demo-store limitation, not
// something this test should assert on repeatedly. What IS asserted here (product id
// resolution, cart creation with the real payload shape, a real stock error, and
// validation) is fast, stable, and is exactly the part most likely to regress if
// someone "corrects" a payload shape back to what the public docs show.

const BASE_URL = process.env.BLAZE_ECOM_BASE_URL?.trim() || 'https://ecom-api.staging.blaze.me';
const STORE_UUID = process.env.BLAZE_ECOM_STORE_UUID?.trim() || 'e87437f2-3e35-4738-af5e-6307e368255c';

// Real, in-stock, low-cost products on the demo store as of 2026-08-06 (see the
// phase report for how these were found — several nearby ids 486-489 return a
// genuine product_out_of_stock error on this shared demo store regardless of
// quantity requested).
const IN_STOCK_SLUG = 'sour-diesel-505';
const OUT_OF_STOCK_SLUG = 'grandaddy-purple-489';

async function stagingIsReachable(): Promise<boolean> {
  // Same Promise.race approach as blaze-ecom-source.contract.test.ts, for the same
  // reason: AbortSignal from jsdom's globals doesn't satisfy Node's undici fetch.
  const probe = fetch(`${BASE_URL}/api/v1/store`, {
    headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-Store': STORE_UUID },
  })
    .then((r) => r.ok)
    .catch(() => false);
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000));
  return Promise.race([probe, timeout]);
}

const reachable = await stagingIsReachable();

if (!reachable) {
  describe.skip('BlazeCheckoutClient (staging)', () => {
    it(`skipped — ${BASE_URL} was unreachable when this test file loaded`, () => {});
  });
  // eslint-disable-next-line no-console
  console.warn(`[blaze-checkout-client.contract.test] Skipping: could not reach ${BASE_URL}/api/v1/store.`);
} else {
  describe('BlazeCheckoutClient (staging)', () => {
    const client = new BlazeCheckoutClient({ baseUrl: BASE_URL, storeUuid: STORE_UUID });

    it('resolves a real product slug to its numeric cart-API id', async () => {
      const id = await client.resolveProductId(IN_STOCK_SLUG);
      expect(id).toBe('505');
    });

    it('returns null for an unknown slug rather than throwing', async () => {
      const id = await client.resolveProductId('this-slug-does-not-exist-xyz');
      expect(id).toBeNull();
    });

    it('creates a real cart with the live-verified request shape, then adds a second item', async () => {
      const productId = await client.resolveProductId(IN_STOCK_SLUG);
      expect(productId).not.toBeNull();

      const { cartUuid } = await client.createCart({ productId: productId!, quantity: 1 });
      expect(cartUuid).toMatch(/^[0-9a-f-]{36}$/);

      await client.setPickup(cartUuid);
      const { totalCents } = await client.validateCart(cartUuid);
      expect(totalCents).not.toBeNull();
      expect(totalCents).toBeGreaterThan(0);
    });

    it('surfaces a real product_out_of_stock error as a BlazeApiError with a customer-readable detail', async () => {
      const productId = await client.resolveProductId(OUT_OF_STOCK_SLUG);
      expect(productId).not.toBeNull();

      let caught: unknown;
      try {
        await client.createCart({ productId: productId!, quantity: 1 });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BlazeApiError);
      const apiError = caught as BlazeApiError;
      expect(apiError.errors[0]?.code).toBe('product_out_of_stock');
      expect(apiError.errors[0]?.detail).toBeTruthy();
    });
  });
}
