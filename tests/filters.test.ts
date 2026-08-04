import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  EMPTY_FILTERS,
  sortProducts,
  toMgPerG,
  type FilterState,
} from '@/lib/filters';
import type { Product } from '@/lib/catalog/types';

function make(overrides: Partial<Product>): Product {
  return {
    id: overrides.slug ?? 'x',
    slug: 'x',
    name: 'Product',
    brand: 'Brand A',
    category: 'pre-rolls',
    strainType: 'hybrid',
    thc: { min: 20, max: 20, unit: '%' },
    cbd: null,
    size: '1 g',
    priceCents: 2000,
    salePriceCents: null,
    inStock: true,
    images: [],
    description: 'd',
    terpenes: [],
    effects: [],
    badges: [],
    addedAt: '2026-01-01',
    ...overrides,
  } as Product;
}

const filters = (over: Partial<FilterState>): FilterState => ({ ...EMPTY_FILTERS, ...over });

describe('toMgPerG', () => {
  it('passes mg/g through unchanged', () => {
    expect(toMgPerG({ min: 100, max: 200, unit: 'mg/g' })).toEqual({ min: 100, max: 200 });
  });

  it('converts percent to mg/g at ten times the value', () => {
    expect(toMgPerG({ min: 18, max: 24, unit: '%' })).toEqual({ min: 180, max: 240 });
  });

  it('returns null for a null range', () => {
    expect(toMgPerG(null)).toBeNull();
  });
});

describe('applyFilters', () => {
  const products = [
    make({ slug: 'a', category: 'pre-rolls', brand: 'Brand A', priceCents: 1000, strainType: 'indica-dominant' }),
    make({ slug: 'b', category: 'vape', brand: 'Brand B', priceCents: 5000, strainType: 'sativa-dominant' }),
    make({ slug: 'c', category: 'vape', brand: 'Brand A', priceCents: 3000, inStock: false }),
  ];

  it('returns everything when no filters are set', () => {
    expect(applyFilters(products, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = applyFilters(products, filters({ categories: ['vape'] }));
    expect(result.map((p) => p.slug)).toEqual(['b', 'c']);
  });

  it('treats multiple categories as OR', () => {
    const result = applyFilters(products, filters({ categories: ['vape', 'pre-rolls'] }));
    expect(result).toHaveLength(3);
  });

  it('filters by brand', () => {
    const result = applyFilters(products, filters({ brands: ['Brand A'] }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'c']);
  });

  it('filters by strain type', () => {
    const result = applyFilters(products, filters({ strainTypes: ['indica-dominant'] }));
    expect(result.map((p) => p.slug)).toEqual(['a']);
  });

  it('treats different filter groups as AND', () => {
    const result = applyFilters(products, filters({ categories: ['vape'], brands: ['Brand A'] }));
    expect(result.map((p) => p.slug)).toEqual(['c']);
  });

  it('filters by minimum price against the effective price', () => {
    const sale = make({ slug: 'd', priceCents: 9000, salePriceCents: 1000 });
    const result = applyFilters([...products, sale], filters({ priceMaxCents: 1500 }));
    expect(result.map((p) => p.slug).sort()).toEqual(['a', 'd']);
  });

  it('filters by price range inclusively', () => {
    const result = applyFilters(products, filters({ priceMinCents: 1000, priceMaxCents: 3000 }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'c']);
  });

  it('compares THC across units by normalising to mg/g', () => {
    const percent = make({ slug: 'pct', thc: { min: 25, max: 25, unit: '%' } });
    const mgg = make({ slug: 'mgg', thc: { min: 100, max: 100, unit: 'mg/g' } });
    const result = applyFilters([percent, mgg], filters({ thcMinMgPerG: 200 }));
    expect(result.map((p) => p.slug)).toEqual(['pct']);
  });

  it('excludes products with no THC data when a THC minimum is set', () => {
    const none = make({ slug: 'none', thc: null });
    const result = applyFilters([none], filters({ thcMinMgPerG: 1 }));
    expect(result).toEqual([]);
  });

  // Potency is sold as a range because of batch variance, so a 22–30% product can
  // legitimately arrive at 22%. Overlap is deliberate: strict containment would hide
  // most of the shelf. These two tests exist because every other fixture uses a
  // degenerate min === max range, which cannot tell the two semantics apart.
  it('matches a product whose THC range overlaps the requested window', () => {
    const wide = make({ slug: 'wide', thc: { min: 22, max: 30, unit: '%' } });
    expect(applyFilters([wide], filters({ thcMaxMgPerG: 250 }))).toHaveLength(1);
    expect(applyFilters([wide], filters({ thcMinMgPerG: 250 }))).toHaveLength(1);
  });

  it('excludes a product whose THC range sits entirely outside the window', () => {
    const wide = make({ slug: 'wide', thc: { min: 22, max: 30, unit: '%' } });
    expect(applyFilters([wide], filters({ thcMaxMgPerG: 200 }))).toEqual([]);
    expect(applyFilters([wide], filters({ thcMinMgPerG: 320 }))).toEqual([]);
  });

  it('hides out-of-stock products when inStockOnly is set', () => {
    const result = applyFilters(products, filters({ inStockOnly: true }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('searches name, brand, and category case-insensitively', () => {
    const named = make({ slug: 'z', name: 'Orange Tingz', brand: 'Pistol' });
    expect(applyFilters([named], filters({ search: 'orange' }))).toHaveLength(1);
    expect(applyFilters([named], filters({ search: 'PISTOL' }))).toHaveLength(1);
    expect(applyFilters([named], filters({ search: 'nope' }))).toHaveLength(0);
  });

  it('ignores surrounding whitespace in the search term', () => {
    const named = make({ slug: 'z', name: 'Orange Tingz' });
    expect(applyFilters([named], filters({ search: '  orange  ' }))).toHaveLength(1);
  });
});

describe('sortProducts', () => {
  const products = [
    make({ slug: 'mid', name: 'B', priceCents: 3000, thc: { min: 10, max: 10, unit: '%' }, addedAt: '2026-02-01' }),
    make({ slug: 'low', name: 'C', priceCents: 1000, thc: { min: 30, max: 30, unit: '%' }, addedAt: '2026-03-01' }),
    make({ slug: 'high', name: 'A', priceCents: 5000, thc: { min: 20, max: 20, unit: '%' }, addedAt: '2026-01-01' }),
  ];

  it('sorts by price ascending', () => {
    expect(sortProducts(products, 'price-asc').map((p) => p.slug)).toEqual(['low', 'mid', 'high']);
  });

  it('sorts by price descending', () => {
    expect(sortProducts(products, 'price-desc').map((p) => p.slug)).toEqual(['high', 'mid', 'low']);
  });

  it('sorts by THC descending, normalised across units', () => {
    expect(sortProducts(products, 'thc-desc').map((p) => p.slug)).toEqual(['low', 'high', 'mid']);
  });

  it('sorts by name ascending', () => {
    expect(sortProducts(products, 'name-asc').map((p) => p.slug)).toEqual(['high', 'mid', 'low']);
  });

  it('sorts by newest first', () => {
    expect(sortProducts(products, 'newest').map((p) => p.slug)).toEqual(['low', 'mid', 'high']);
  });

  it('does not mutate the input array', () => {
    const input = [...products];
    sortProducts(input, 'price-asc');
    expect(input.map((p) => p.slug)).toEqual(['mid', 'low', 'high']);
  });

  it('puts out-of-stock products last under featured sorting', () => {
    const sorted = sortProducts(
      [make({ slug: 'out', inStock: false }), make({ slug: 'in', inStock: true })],
      'featured',
    );
    expect(sorted.map((p) => p.slug)).toEqual(['in', 'out']);
  });
});
