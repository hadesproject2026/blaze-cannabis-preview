import { describe, it } from 'vitest';
import { BlazeEcomCatalogSource } from '@/lib/catalog/blaze-ecom-source';
import { runCatalogSourceContract } from './catalog-source.contract';

// This suite hits the live BLAZE ECOM staging API over the network. It must not fail
// an offline `npm test` — if staging is unreachable, it skips cleanly instead of
// erroring. The mapper's own correctness is covered separately (and offline) by
// blaze-ecom-mapper.test.ts.

const BASE_URL = process.env.BLAZE_ECOM_BASE_URL?.trim() || 'https://ecom-api.staging.blaze.me';
const STORE_UUID = process.env.BLAZE_ECOM_STORE_UUID?.trim() || 'e87437f2-3e35-4738-af5e-6307e368255c';

async function stagingIsReachable(): Promise<boolean> {
  // Deliberately not using AbortSignal.timeout()/AbortController here: under
  // vitest's jsdom environment, jsdom installs its own AbortController/AbortSignal
  // globals, and Node's undici-based fetch rejects a signal that isn't *its*
  // AbortSignal class ("Expected signal to be an instance of AbortSignal"). A plain
  // Promise.race sidesteps that cross-realm mismatch entirely.
  const probe = fetch(`${BASE_URL}/api/v1/store`, {
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      'X-Store': STORE_UUID,
    },
  })
    .then((response) => response.ok)
    .catch(() => false);

  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000));

  return Promise.race([probe, timeout]);
}

const reachable = await stagingIsReachable();

if (!reachable) {
  describe.skip('CatalogSource contract: BlazeEcomCatalogSource (staging)', () => {
    it(`skipped — ${BASE_URL} was unreachable when this test file loaded`, () => {});
  });
  // eslint-disable-next-line no-console
  console.warn(
    `[blaze-ecom-source.contract.test] Skipping: could not reach ${BASE_URL}/api/v1/store. ` +
      'This is expected offline; run again with network access to exercise the live contract suite.',
  );
} else {
  runCatalogSourceContract(
    'BlazeEcomCatalogSource (staging)',
    () => new BlazeEcomCatalogSource({ baseUrl: BASE_URL, storeUuid: STORE_UUID }),
    { knownStoreId: STORE_UUID },
  );
}
