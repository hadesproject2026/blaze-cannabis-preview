import type { Product, ProductBadge } from './catalog/types';

/**
 * In-memory admin overlay for the demo admin area. Nothing here persists —
 * state lives only for the current session and resets on reload, by design
 * (see the admin route group's README-equivalent notes in the phase report).
 */

export interface ProductOverride {
  inStock?: boolean;
  priceCents?: number;
  staffPick?: boolean;
}

export type ReservationStatus = 'New' | 'Ready' | 'Collected';

export interface ReservationItem {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  items: ReservationItem[];
  totalCents: number;
  status: ReservationStatus;
  createdAt: string;
}

export interface AdminState {
  overrides: Record<string, ProductOverride>;
  reservations: Reservation[];
}

export const EMPTY_ADMIN_STATE: AdminState = {
  overrides: {},
  reservations: [],
};

export type AdminAction =
  | { type: 'setInStock'; productId: string; inStock: boolean }
  | { type: 'setPrice'; productId: string; priceCents: number }
  | { type: 'setStaffPick'; productId: string; staffPick: boolean }
  | { type: 'setReservationStatus'; reservationId: string; status: ReservationStatus }
  | { type: 'seedReservations'; reservations: Reservation[] };

function withOverride(
  state: AdminState,
  productId: string,
  patch: Partial<ProductOverride>,
): AdminState {
  return {
    ...state,
    overrides: {
      ...state.overrides,
      [productId]: { ...state.overrides[productId], ...patch },
    },
  };
}

export function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'setInStock':
      return withOverride(state, action.productId, { inStock: action.inStock });

    case 'setPrice':
      // A negative or non-finite price is meaningless — ignore it rather than
      // let a stray keystroke put the shelf price at -$4.00.
      if (!Number.isFinite(action.priceCents) || action.priceCents < 0) return state;
      return withOverride(state, action.productId, { priceCents: Math.round(action.priceCents) });

    case 'setStaffPick':
      return withOverride(state, action.productId, { staffPick: action.staffPick });

    case 'setReservationStatus':
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.reservationId ? { ...r, status: action.status } : r,
        ),
      };

    case 'seedReservations':
      return { ...state, reservations: action.reservations };

    default:
      return state;
  }
}

/**
 * Applies a single product's override on top of its base catalog data.
 * `staffPick` toggles the `staff-pick` badge in `badges` without disturbing
 * any other badge (`new-drop`, `on-sale`) the product already carries.
 */
export function applyOverride(product: Product, override: ProductOverride | undefined): Product {
  if (!override) return product;

  const inStock = override.inStock ?? product.inStock;
  const priceCents = override.priceCents ?? product.priceCents;
  const hadStaffPick = product.badges.includes('staff-pick');
  const staffPick = override.staffPick ?? hadStaffPick;

  let badges = product.badges;
  if (staffPick !== hadStaffPick) {
    badges = staffPick
      ? [...product.badges, 'staff-pick' as ProductBadge]
      : product.badges.filter((b) => b !== 'staff-pick');
  }

  if (inStock === product.inStock && priceCents === product.priceCents && badges === product.badges) {
    return product;
  }

  return { ...product, inStock, priceCents, badges };
}

/** Overlays every admin override onto a base product list. Pure — same input, same output. */
export function applyOverrides(
  products: Product[],
  overrides: Record<string, ProductOverride>,
): Product[] {
  return products.map((p) => applyOverride(p, overrides[p.id]));
}

export interface DashboardStats {
  total: number;
  byCategory: Record<string, number>;
  outOfStock: number;
  onSale: number;
  budtenderSelects: number;
}

/** Derives at-a-glance dashboard figures from a (possibly overlaid) product list. */
export function getDashboardStats(products: Product[]): DashboardStats {
  const byCategory: Record<string, number> = {};
  let outOfStock = 0;
  let onSale = 0;
  let budtenderSelects = 0;

  for (const p of products) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    if (!p.inStock) outOfStock += 1;
    if (p.salePriceCents !== null) onSale += 1;
    if (p.badges.includes('staff-pick')) budtenderSelects += 1;
  }

  return { total: products.length, byCategory, outOfStock, onSale, budtenderSelects };
}
