import type { Product } from './types';

/**
 * Named product views surfaced from the nav drawer's quick links
 * (`/menu/brampton?view=...`). Kept separate from lib/filters.ts — that
 * module's FilterState is consumed elsewhere and is out of scope here.
 */
export type ViewKey = 'sale' | 'new' | 'dried-flower' | 'ounces';

const VIEW_KEYS: ViewKey[] = ['sale', 'new', 'dried-flower', 'ounces'];

export const VIEW_LABELS: Record<ViewKey, string> = {
  sale: 'On Sale Items',
  new: 'New Drops',
  'dried-flower': 'Dried Flower',
  ounces: "Ounce's",
};

// "New" means added on or after this date. Kept as a plain ISO date string so
// it compares lexicographically against Product['addedAt'] without parsing.
const NEW_DROPS_SINCE = '2026-08-01';

/** Narrows an arbitrary searchParams value down to a known ViewKey, or null. */
export function parseView(raw: string | string[] | undefined): ViewKey | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value !== undefined && VIEW_KEYS.includes(value as ViewKey) ? (value as ViewKey) : null;
}

export function applyView(products: Product[], view: ViewKey | null): Product[] {
  switch (view) {
    case 'sale':
      return products.filter((p) => p.salePriceCents !== null);
    case 'new':
      return products
        .filter((p) => p.addedAt >= NEW_DROPS_SINCE)
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case 'dried-flower':
      return products.filter((p) => p.category === 'dried-flower');
    case 'ounces':
      return products.filter((p) => p.size === '28 grams');
    default:
      return products;
  }
}
