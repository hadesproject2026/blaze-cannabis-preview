import { describe, expect, it } from 'vitest';
import {
  cartCount,
  cartReducer,
  cartSubtotalCents,
  lineFromProduct,
  type CartLine,
} from '@/lib/cart';
import type { Product } from '@/lib/catalog/types';

const product = {
  id: 'p-1',
  slug: 'orange-tingz',
  name: 'Orange Tingz',
  brand: 'Pistol and Paris',
  priceCents: 2400,
  salePriceCents: null,
  images: ['/products/orange-tingz.jpg'],
} as Product;

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'p-1',
  slug: 'orange-tingz',
  name: 'Orange Tingz',
  brand: 'Pistol and Paris',
  priceCents: 2400,
  image: '/products/orange-tingz.jpg',
  qty: 1,
  ...over,
});

describe('lineFromProduct', () => {
  it('uses the effective price', () => {
    expect(lineFromProduct({ ...product, salePriceCents: 1800 }).priceCents).toBe(1800);
  });

  it('uses the first image, or null when there is none', () => {
    expect(lineFromProduct(product).image).toBe('/products/orange-tingz.jpg');
    expect(lineFromProduct({ ...product, images: [] }).image).toBeNull();
  });
});

describe('cartReducer', () => {
  it('adds a new line with quantity one', () => {
    const state = cartReducer([], { type: 'add', product });
    expect(state).toHaveLength(1);
    expect(state[0].qty).toBe(1);
  });

  it('increments quantity when the same product is added again', () => {
    const state = cartReducer([line()], { type: 'add', product });
    expect(state).toHaveLength(1);
    expect(state[0].qty).toBe(2);
  });

  it('adds a specific quantity when given', () => {
    const state = cartReducer([], { type: 'add', product, qty: 3 });
    expect(state[0].qty).toBe(3);
  });

  it('removes a line', () => {
    expect(cartReducer([line()], { type: 'remove', productId: 'p-1' })).toEqual([]);
  });

  it('ignores removal of a product that is not in the cart', () => {
    const state = [line()];
    expect(cartReducer(state, { type: 'remove', productId: 'nope' })).toEqual(state);
  });

  it('sets an explicit quantity', () => {
    const state = cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: 5 });
    expect(state[0].qty).toBe(5);
  });

  it('removes the line when quantity is set to zero', () => {
    expect(cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: 0 })).toEqual([]);
  });

  it('removes the line when quantity is set below zero', () => {
    expect(cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: -2 })).toEqual([]);
  });

  it('clears every line', () => {
    expect(cartReducer([line(), line({ productId: 'p-2' })], { type: 'clear' })).toEqual([]);
  });

  it('replaces state on hydrate', () => {
    const restored = [line({ qty: 4 })];
    expect(cartReducer([], { type: 'hydrate', lines: restored })).toEqual(restored);
  });

  it('does not mutate the previous state', () => {
    const state = [line()];
    cartReducer(state, { type: 'add', product });
    expect(state[0].qty).toBe(1);
  });
});

describe('cart selectors', () => {
  it('sums the subtotal across lines and quantities', () => {
    const lines = [line({ qty: 2 }), line({ productId: 'p-2', priceCents: 1000, qty: 3 })];
    expect(cartSubtotalCents(lines)).toBe(2400 * 2 + 1000 * 3);
  });

  it('returns zero for an empty cart', () => {
    expect(cartSubtotalCents([])).toBe(0);
  });

  it('counts total items, not distinct lines', () => {
    expect(cartCount([line({ qty: 2 }), line({ productId: 'p-2', qty: 3 })])).toBe(5);
  });
});
