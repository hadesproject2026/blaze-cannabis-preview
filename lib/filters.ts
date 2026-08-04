import type { PotencyRange, Product, StrainType } from './catalog/types';
import { effectivePriceCents } from './format';

export interface FilterState {
  categories: string[];
  brands: string[];
  strainTypes: StrainType[];
  thcMinMgPerG: number | null;
  thcMaxMgPerG: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  inStockOnly: boolean;
  search: string;
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  brands: [],
  strainTypes: [],
  thcMinMgPerG: null,
  thcMaxMgPerG: null,
  priceMinCents: null,
  priceMaxCents: null,
  inStockOnly: false,
  search: '',
};

export function toMgPerG(range: PotencyRange | null): { min: number; max: number } | null {
  if (!range) return null;
  const factor = range.unit === '%' ? 10 : 1;
  return { min: range.min * factor, max: range.max * factor };
}

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  const term = filters.search.trim().toLowerCase();

  return products.filter((product) => {
    if (filters.categories.length && !filters.categories.includes(product.category)) return false;
    if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
    if (
      filters.strainTypes.length &&
      (!product.strainType || !filters.strainTypes.includes(product.strainType))
    ) {
      return false;
    }
    if (filters.inStockOnly && !product.inStock) return false;

    const price = effectivePriceCents(product);
    if (filters.priceMinCents !== null && price < filters.priceMinCents) return false;
    if (filters.priceMaxCents !== null && price > filters.priceMaxCents) return false;

    if (filters.thcMinMgPerG !== null || filters.thcMaxMgPerG !== null) {
      const thc = toMgPerG(product.thc);
      if (!thc) return false;
      if (filters.thcMinMgPerG !== null && thc.max < filters.thcMinMgPerG) return false;
      if (filters.thcMaxMgPerG !== null && thc.min > filters.thcMaxMgPerG) return false;
    }

    if (term) {
      const haystack = `${product.name} ${product.brand} ${product.category}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });
}

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'thc-desc' | 'name-asc' | 'newest';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'thc-desc', label: 'THC: high to low' },
  { key: 'name-asc', label: 'Name: A–Z' },
  { key: 'newest', label: 'Newest' },
];

function thcMax(product: Product): number {
  return toMgPerG(product.thc)?.max ?? -1;
}

export function sortProducts(products: Product[], key: SortKey): Product[] {
  const copy = [...products];

  switch (key) {
    case 'price-asc':
      return copy.sort((a, b) => effectivePriceCents(a) - effectivePriceCents(b));
    case 'price-desc':
      return copy.sort((a, b) => effectivePriceCents(b) - effectivePriceCents(a));
    case 'thc-desc':
      return copy.sort((a, b) => thcMax(b) - thcMax(a));
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
      return copy.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        const aPick = a.badges.includes('staff-pick') ? 0 : 1;
        const bPick = b.badges.includes('staff-pick') ? 0 : 1;
        return aPick - bPick;
      });
  }
}
