import type { Product, ProductBadge, Store, StoreHours } from './catalog/types';

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

export type ReviewStatus = 'Published' | 'Hidden';

export interface Review {
  id: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  productId: string;
  productName: string;
  comment: string;
  date: string;
  status: ReviewStatus;
}

/** A row on the Customers surface — always derived, never edited directly. */
export interface CustomerSummary {
  name: string;
  orderCount: number;
  totalCents: number;
  lastOrderDate: string;
}

export interface AdminState {
  overrides: Record<string, ProductOverride>;
  reservations: Reservation[];
  reviews: Review[];
  /** Product ids the operator has flagged on the Gallery surface as needing a reshoot. */
  needsPhotoIds: string[];
  /** In-memory editable copy of the store record shown on Shop settings. */
  storeSettings: Store | null;
}

export const EMPTY_ADMIN_STATE: AdminState = {
  overrides: {},
  reservations: [],
  reviews: [],
  needsPhotoIds: [],
  storeSettings: null,
};

export type AdminAction =
  | { type: 'setInStock'; productId: string; inStock: boolean }
  | { type: 'setPrice'; productId: string; priceCents: number }
  | { type: 'setStaffPick'; productId: string; staffPick: boolean }
  | { type: 'setReservationStatus'; reservationId: string; status: ReservationStatus }
  | { type: 'seedReservations'; reservations: Reservation[] }
  | { type: 'setReviewStatus'; reviewId: string; status: ReviewStatus }
  | { type: 'seedReviews'; reviews: Review[] }
  | { type: 'setNeedsPhoto'; productId: string; needsPhoto: boolean }
  | { type: 'seedStoreSettings'; store: Store }
  | {
      type: 'updateStoreSettings';
      patch: Partial<Pick<Store, 'name' | 'address' | 'city' | 'province' | 'postalCode' | 'phone'>>;
    }
  | { type: 'updateStoreHours'; index: number; patch: Partial<StoreHours> };

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

    case 'setReviewStatus':
      return {
        ...state,
        reviews: state.reviews.map((r) =>
          r.id === action.reviewId ? { ...r, status: action.status } : r,
        ),
      };

    case 'seedReviews':
      return { ...state, reviews: action.reviews };

    case 'setNeedsPhoto':
      if (action.needsPhoto) {
        if (state.needsPhotoIds.includes(action.productId)) return state;
        return { ...state, needsPhotoIds: [...state.needsPhotoIds, action.productId] };
      }
      if (!state.needsPhotoIds.includes(action.productId)) return state;
      return {
        ...state,
        needsPhotoIds: state.needsPhotoIds.filter((id) => id !== action.productId),
      };

    case 'seedStoreSettings':
      return { ...state, storeSettings: action.store };

    case 'updateStoreSettings':
      if (!state.storeSettings) return state;
      return { ...state, storeSettings: { ...state.storeSettings, ...action.patch } };

    case 'updateStoreHours':
      if (!state.storeSettings) return state;
      return {
        ...state,
        storeSettings: {
          ...state.storeSettings,
          hours: state.storeSettings.hours.map((h, i) =>
            i === action.index ? { ...h, ...action.patch } : h,
          ),
        },
      };

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

/**
 * Groups fabricated orders (see lib/sample-reservations.ts) into a per-customer
 * summary so the Customers surface always reconciles with Orders — same
 * names, same totals, no separate customer data invented.
 */
export function deriveCustomers(reservations: Reservation[]): CustomerSummary[] {
  const byName = new Map<string, CustomerSummary>();

  for (const r of reservations) {
    const existing = byName.get(r.customerName);
    if (existing) {
      existing.orderCount += 1;
      existing.totalCents += r.totalCents;
      if (r.createdAt > existing.lastOrderDate) existing.lastOrderDate = r.createdAt;
    } else {
      byName.set(r.customerName, {
        name: r.customerName,
        orderCount: 1,
        totalCents: r.totalCents,
        lastOrderDate: r.createdAt,
      });
    }
  }

  return Array.from(byName.values()).sort((a, b) => b.totalCents - a.totalCents);
}

export interface GalleryStats {
  total: number;
  withImages: number;
  missing: number;
  flagged: number;
}

/**
 * Summary figures for the Gallery photography review surface — every number
 * derived from the live catalog and the operator's in-session reshoot flags.
 * `flagged` is intersected against the current product list so a flag can
 * never outlive the product it was set on.
 */
export function getGalleryStats(products: Product[], needsPhotoIds: string[]): GalleryStats {
  const withImages = products.filter((p) => p.images.length > 0).length;
  const productIds = new Set(products.map((p) => p.id));
  const flagged = needsPhotoIds.filter((id) => productIds.has(id)).length;

  return {
    total: products.length,
    withImages,
    missing: products.length - withImages,
    flagged,
  };
}
