import type { Product } from './catalog/types';
import { effectivePriceCents } from './format';

export const CART_STORAGE_KEY = 'blaze.cart.v1';

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string | null;
  qty: number;
}

export type CartAction =
  | { type: 'add'; product: Product; qty?: number }
  | { type: 'remove'; productId: string }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] };

export function lineFromProduct(product: Product, qty = 1): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    priceCents: effectivePriceCents(product),
    image: product.images[0] ?? null,
    qty,
  };
}

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const qty = action.qty ?? 1;
      // A non-positive add is meaningless, and must never leave a zero- or
      // negative-quantity line behind. Removal is setQty's job, not add's.
      if (qty <= 0) return state;
      const existing = state.find((l) => l.productId === action.product.id);
      if (existing) {
        return state.map((l) =>
          l.productId === action.product.id ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...state, lineFromProduct(action.product, qty)];
    }
    case 'remove':
      return state.filter((l) => l.productId !== action.productId);
    case 'setQty':
      if (action.qty <= 0) return state.filter((l) => l.productId !== action.productId);
      return state.map((l) => (l.productId === action.productId ? { ...l, qty: action.qty } : l));
    case 'clear':
      return [];
    case 'hydrate':
      return action.lines;
    default:
      return state;
  }
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
