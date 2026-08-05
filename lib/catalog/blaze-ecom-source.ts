import type { CatalogSource } from './source';
import type { Category, Product, Store } from './types';
import {
  mapBlazeCategories,
  mapBlazeProductResponse,
  mapBlazeProductsResponse,
  mapBlazeStore,
  type BlazeCategoriesResponse,
  type BlazeProductResponse,
  type BlazeProductsResponse,
  type BlazeStoreResponse,
} from './blaze-ecom-mapper';

export interface BlazeEcomCatalogSourceOptions {
  baseUrl: string;
  storeUuid: string;
  /** Page size for listProducts(). The staging API caps this at 100 regardless of what's requested. */
  productLimit?: number;
  /** How long a successful fetch is trusted before a refetch is attempted, in ms. */
  cacheTtlMs?: number;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_PRODUCT_LIMIT = 100;

/**
 * Reads the live BLAZE ECOM commerce API. See blaze-ecom-mapper.ts for the field
 * mapping and `.superpowers/sdd/live-phase1-report.md` for how it was derived.
 *
 * Degradation: each of listProducts()/listCategories()/getStore() caches its last
 * successful response in memory. A fetch within `cacheTtlMs` of the last success
 * reuses the cache without hitting the network. A fetch past that window still tries
 * the network first; if that attempt fails, the (now-stale) cached value is served
 * instead of erroring. If there is no prior success to fall back to, the error
 * propagates — an empty shelf is worse than an honest failure.
 */
export class BlazeEcomCatalogSource implements CatalogSource {
  private readonly baseUrl: string;
  private readonly storeUuid: string;
  private readonly productLimit: number;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;

  private productsCache: CacheEntry<Product[]> | null = null;
  private categoriesCache: CacheEntry<Category[]> | null = null;
  private storeCache: CacheEntry<Store | null> | null = null;

  constructor(options: BlazeEcomCatalogSourceOptions) {
    if (!options.baseUrl) throw new Error('BlazeEcomCatalogSource requires a baseUrl.');
    if (!options.storeUuid) throw new Error('BlazeEcomCatalogSource requires a storeUuid.');
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.storeUuid = options.storeUuid;
    this.productLimit = options.productLimit ?? DEFAULT_PRODUCT_LIMIT;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      'X-Store': this.storeUuid,
    };
  }

  /** Returns the parsed JSON body, `null` for a 404, or throws for any other failure. */
  private async request(path: string): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`BLAZE ECOM request failed: ${response.status} ${response.statusText} (${path})`);
    }
    return response.json();
  }

  private isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    return entry !== null && Date.now() - entry.fetchedAt < this.cacheTtlMs;
  }

  async listProducts(): Promise<Product[]> {
    if (this.isFresh(this.productsCache)) return this.productsCache.value;
    try {
      const payload = (await this.request(
        `/api/v1/products?limit=${this.productLimit}`,
      )) as BlazeProductsResponse | null;
      const products = mapBlazeProductsResponse(payload ?? { data: [] });
      this.productsCache = { value: products, fetchedAt: Date.now() };
      return products;
    } catch (error) {
      if (this.productsCache) return this.productsCache.value;
      throw error;
    }
  }

  async getProduct(slug: string): Promise<Product | null> {
    const payload = (await this.request(`/api/v2/products/${encodeURIComponent(slug)}`)) as
      | BlazeProductResponse
      | null;
    if (payload === null) return null;
    return mapBlazeProductResponse(payload);
  }

  async listCategories(): Promise<Category[]> {
    if (this.isFresh(this.categoriesCache)) return this.categoriesCache.value;
    try {
      const payload = (await this.request('/api/v1/products/categories')) as BlazeCategoriesResponse | null;
      const categories = mapBlazeCategories(payload ?? { data: [] });
      this.categoriesCache = { value: categories, fetchedAt: Date.now() };
      return categories;
    } catch (error) {
      if (this.categoriesCache) return this.categoriesCache.value;
      throw error;
    }
  }

  async getStore(id: string): Promise<Store | null> {
    const store = await this.fetchStore();
    return store && store.id === id ? store : null;
  }

  /**
   * BLAZE ECOM has no per-id store lookup: `GET /api/v1/store` always returns the
   * single store bound to the `X-Store` header. `getStore(id)` fetches that store
   * once (cached like the other reads) and compares its id, so an unknown id resolves
   * to null without an extra request.
   */
  private async fetchStore(): Promise<Store | null> {
    if (this.isFresh(this.storeCache)) return this.storeCache.value;
    try {
      const payload = (await this.request('/api/v1/store')) as BlazeStoreResponse | null;
      const store = payload === null ? null : mapBlazeStore(payload);
      this.storeCache = { value: store, fetchedAt: Date.now() };
      return store;
    } catch (error) {
      if (this.storeCache) return this.storeCache.value;
      throw error;
    }
  }
}
