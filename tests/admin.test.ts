import { describe, expect, it } from 'vitest';
import {
  adminReducer,
  applyOverride,
  applyOverrides,
  EMPTY_ADMIN_STATE,
  getDashboardStats,
  type AdminState,
  type ProductOverride,
  type Reservation,
} from '@/lib/admin';
import type { Product } from '@/lib/catalog/types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    slug: 'orange-tingz',
    name: 'Orange Tingz',
    brand: 'Pistol and Paris',
    category: 'dried-flower',
    strainType: 'hybrid',
    thc: { min: 20, max: 20, unit: '%' },
    cbd: null,
    size: '3.5 grams',
    priceCents: 2400,
    salePriceCents: null,
    inStock: true,
    images: [],
    description: '',
    terpenes: [],
    effects: [],
    badges: [],
    addedAt: '2026-01-01',
    ...overrides,
  };
}

const product = makeProduct();

const reservation = (over: Partial<Reservation> = {}): Reservation => ({
  id: 'res-1',
  customerName: 'Priya Nathan',
  items: [{ productId: 'p-1', name: 'Orange Tingz', qty: 1, priceCents: 2400 }],
  totalCents: 2400,
  status: 'New',
  createdAt: '2026-08-01',
  ...over,
});

describe('applyOverride', () => {
  it('returns the product unchanged when there is no override', () => {
    expect(applyOverride(product, undefined)).toBe(product);
  });

  it('overrides inStock', () => {
    expect(applyOverride(product, { inStock: false }).inStock).toBe(false);
  });

  it('overrides priceCents', () => {
    expect(applyOverride(product, { priceCents: 1999 }).priceCents).toBe(1999);
  });

  it('falls back to the base value for fields with no override', () => {
    const result = applyOverride(product, { inStock: false });
    expect(result.priceCents).toBe(2400);
  });

  it('adds the staff-pick badge when staffPick is set true', () => {
    const result = applyOverride(product, { staffPick: true });
    expect(result.badges).toContain('staff-pick');
  });

  it('removes the staff-pick badge when staffPick is set false', () => {
    const withBadge = { ...product, badges: ['staff-pick' as const] };
    const result = applyOverride(withBadge, { staffPick: false });
    expect(result.badges).not.toContain('staff-pick');
  });

  it('preserves other badges when toggling staff-pick', () => {
    const withBadges = { ...product, badges: ['new-drop' as const] };
    const result = applyOverride(withBadges, { staffPick: true });
    expect(result.badges).toEqual(expect.arrayContaining(['new-drop', 'staff-pick']));
  });

  it('does not mutate the original product', () => {
    applyOverride(product, { inStock: false, priceCents: 1 });
    expect(product.inStock).toBe(true);
    expect(product.priceCents).toBe(2400);
  });
});

describe('applyOverrides', () => {
  it('applies each override by product id', () => {
    const other = { ...product, id: 'p-2' };
    const overrides: Record<string, ProductOverride> = { 'p-2': { inStock: false } };
    const result = applyOverrides([product, other], overrides);
    expect(result[0].inStock).toBe(true);
    expect(result[1].inStock).toBe(false);
  });

  it('returns products unchanged when overrides is empty', () => {
    expect(applyOverrides([product], {})).toEqual([product]);
  });
});

describe('adminReducer', () => {
  it('sets inStock for a product', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setInStock', productId: 'p-1', inStock: false });
    expect(state.overrides['p-1']).toEqual({ inStock: false });
  });

  it('sets priceCents for a product', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setPrice', productId: 'p-1', priceCents: 1500 });
    expect(state.overrides['p-1']).toEqual({ priceCents: 1500 });
  });

  it('ignores a negative price', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setPrice', productId: 'p-1', priceCents: -100 });
    expect(state.overrides['p-1']).toBeUndefined();
  });

  it('ignores a non-finite price', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setPrice', productId: 'p-1', priceCents: NaN });
    expect(state.overrides['p-1']).toBeUndefined();
  });

  it('rounds a fractional price to whole cents', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setPrice', productId: 'p-1', priceCents: 1500.7 });
    expect(state.overrides['p-1']).toEqual({ priceCents: 1501 });
  });

  it('sets staffPick for a product', () => {
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setStaffPick', productId: 'p-1', staffPick: true });
    expect(state.overrides['p-1']).toEqual({ staffPick: true });
  });

  it('merges multiple overrides on the same product', () => {
    let state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setInStock', productId: 'p-1', inStock: false });
    state = adminReducer(state, { type: 'setPrice', productId: 'p-1', priceCents: 1000 });
    expect(state.overrides['p-1']).toEqual({ inStock: false, priceCents: 1000 });
  });

  it('keeps overrides for other products untouched', () => {
    let state = adminReducer(EMPTY_ADMIN_STATE, { type: 'setInStock', productId: 'p-1', inStock: false });
    state = adminReducer(state, { type: 'setInStock', productId: 'p-2', inStock: false });
    expect(state.overrides['p-1']).toEqual({ inStock: false });
    expect(state.overrides['p-2']).toEqual({ inStock: false });
  });

  it('does not mutate the previous state', () => {
    const state: AdminState = { ...EMPTY_ADMIN_STATE, overrides: {} };
    adminReducer(state, { type: 'setInStock', productId: 'p-1', inStock: false });
    expect(state.overrides).toEqual({});
  });

  it('seeds reservations', () => {
    const reservations = [reservation()];
    const state = adminReducer(EMPTY_ADMIN_STATE, { type: 'seedReservations', reservations });
    expect(state.reservations).toEqual(reservations);
  });

  it('updates the status of a matching reservation', () => {
    const state: AdminState = { ...EMPTY_ADMIN_STATE, reservations: [reservation()] };
    const next = adminReducer(state, { type: 'setReservationStatus', reservationId: 'res-1', status: 'Ready' });
    expect(next.reservations[0].status).toBe('Ready');
  });

  it('leaves other reservations untouched when updating one status', () => {
    const state: AdminState = {
      ...EMPTY_ADMIN_STATE,
      reservations: [reservation(), reservation({ id: 'res-2', status: 'New' })],
    };
    const next = adminReducer(state, { type: 'setReservationStatus', reservationId: 'res-1', status: 'Collected' });
    expect(next.reservations[1].status).toBe('New');
  });

  it('ignores a status update for an unknown reservation id', () => {
    const state: AdminState = { ...EMPTY_ADMIN_STATE, reservations: [reservation()] };
    const next = adminReducer(state, { type: 'setReservationStatus', reservationId: 'nope', status: 'Ready' });
    expect(next.reservations).toEqual(state.reservations);
  });

  it('returns the same state for an unknown action', () => {
    // @ts-expect-error — deliberately testing the default branch
    expect(adminReducer(EMPTY_ADMIN_STATE, { type: 'noop' })).toBe(EMPTY_ADMIN_STATE);
  });
});

describe('getDashboardStats', () => {
  const products: Product[] = [
    { ...product, id: 'p-1', category: 'dried-flower', inStock: true, salePriceCents: null, badges: [] },
    { ...product, id: 'p-2', category: 'dried-flower', inStock: false, salePriceCents: null, badges: ['staff-pick'] },
    { ...product, id: 'p-3', category: 'vape', inStock: true, salePriceCents: 1800, badges: ['staff-pick'] },
  ];

  it('counts the total', () => {
    expect(getDashboardStats(products).total).toBe(3);
  });

  it('counts products by category', () => {
    expect(getDashboardStats(products).byCategory).toEqual({ 'dried-flower': 2, vape: 1 });
  });

  it('counts out-of-stock products', () => {
    expect(getDashboardStats(products).outOfStock).toBe(1);
  });

  it('counts on-sale products', () => {
    expect(getDashboardStats(products).onSale).toBe(1);
  });

  it('counts Budtender Selects (staff-pick badge)', () => {
    expect(getDashboardStats(products).budtenderSelects).toBe(2);
  });

  it('returns zeroes for an empty catalog', () => {
    expect(getDashboardStats([])).toEqual({
      total: 0,
      byCategory: {},
      outOfStock: 0,
      onSale: 0,
      budtenderSelects: 0,
    });
  });
});
