import { BlazeEcomCatalogSource } from './blaze-ecom-source';
import { MockCatalogSource } from './mock-source';
import type { CatalogSource } from './source';

/** Staging values from the BLAZE ECOM integration spec — used only as fallbacks. */
const STAGING_BASE_URL = 'https://ecom-api.staging.blaze.me';
const STAGING_STORE_UUID = 'e87437f2-3e35-4738-af5e-6307e368255c';

let cached: CatalogSource | null = null;

/**
 * Selects the catalog implementation via `CATALOG_SOURCE`:
 *  - unset or "mock" -> MockCatalogSource (default — the demo must never break
 *    because someone else's API is down)
 *  - "blaze"          -> BlazeEcomCatalogSource, reading BLAZE_ECOM_BASE_URL /
 *    BLAZE_ECOM_STORE_UUID from env (falling back to the documented staging store)
 *
 * These env vars are server-only. Never rename them to NEXT_PUBLIC_* — that would
 * ship the live API's base URL into the client bundle.
 */
export function getCatalogSource(): CatalogSource {
  if (cached) return cached;

  const mode = (process.env.CATALOG_SOURCE ?? 'mock').trim().toLowerCase();

  if (mode === '' || mode === 'mock') {
    cached = new MockCatalogSource();
    return cached;
  }

  if (mode === 'blaze') {
    const baseUrl = process.env.BLAZE_ECOM_BASE_URL?.trim() || STAGING_BASE_URL;
    const storeUuid = process.env.BLAZE_ECOM_STORE_UUID?.trim() || STAGING_STORE_UUID;

    if (!baseUrl || !storeUuid) {
      throw new Error(
        'CATALOG_SOURCE=blaze requires BLAZE_ECOM_BASE_URL and BLAZE_ECOM_STORE_UUID ' +
          '(or the built-in staging fallbacks, which appear to be missing). Set both in ' +
          'your environment, e.g. in .env.local — see .env.example.',
      );
    }

    cached = new BlazeEcomCatalogSource({ baseUrl, storeUuid });
    return cached;
  }

  throw new Error(`Unknown CATALOG_SOURCE "${mode}". Expected "mock" or "blaze".`);
}

export type { CatalogSource } from './source';
export * from './types';
