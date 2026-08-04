import { describe, expect, it } from 'vitest';
import type { CatalogSource } from '@/lib/catalog/source';

export interface CatalogSourceContractOptions {
  /** A store id the implementation under test is expected to resolve. */
  knownStoreId: string;
}

export function runCatalogSourceContract(
  name: string,
  createSource: () => CatalogSource | Promise<CatalogSource>,
  options: CatalogSourceContractOptions,
) {
  describe(`CatalogSource contract: ${name}`, () => {
    it('lists at least one product', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('returns products with unique slugs', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const slugs = products.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('returns products with unique ids', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const ids = products.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('resolves a known slug to the matching product', async () => {
      const source = await createSource();
      const [first] = await source.listProducts();
      const found = await source.getProduct(first.slug);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);
    });

    it('resolves an unknown slug to null rather than throwing', async () => {
      const source = await createSource();
      await expect(source.getProduct('definitely-not-a-real-slug')).resolves.toBeNull();
    });

    it('lists categories with unique slugs', async () => {
      const source = await createSource();
      const categories = await source.listCategories();
      expect(categories.length).toBeGreaterThan(0);
      const slugs = categories.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('only returns products whose category exists in listCategories', async () => {
      const source = await createSource();
      const categories = await source.listCategories();
      const known = new Set(categories.map((c) => c.slug));
      const products = await source.listProducts();
      const orphans = products.filter((p) => !known.has(p.category));
      expect(orphans.map((p) => `${p.slug} -> ${p.category}`)).toEqual([]);
    });

    it('resolves a known store id', async () => {
      const source = await createSource();
      const store = await source.getStore(options.knownStoreId);
      expect(store).not.toBeNull();
      expect(store?.id).toBe(options.knownStoreId);
    });

    it('resolves an unknown store id to null rather than throwing', async () => {
      const source = await createSource();
      await expect(source.getStore('atlantis')).resolves.toBeNull();
    });

    it('never returns a negative price', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      expect(products.filter((p) => p.priceCents < 0)).toEqual([]);
    });

    it('returns a sale price below the regular price whenever one is set', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const bad = products.filter(
        (p) => p.salePriceCents !== null && p.salePriceCents >= p.priceCents,
      );
      expect(bad.map((p) => p.slug)).toEqual([]);
    });

    it('returns potency ranges where min never exceeds max', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const bad = products.filter(
        (p) => (p.thc && p.thc.min > p.thc.max) || (p.cbd && p.cbd.min > p.cbd.max),
      );
      expect(bad.map((p) => p.slug)).toEqual([]);
    });
  });
}
