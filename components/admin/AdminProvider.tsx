'use client';

import { createContext, useContext, useReducer } from 'react';
import {
  adminReducer,
  EMPTY_ADMIN_STATE,
  type ProductOverride,
  type Reservation,
  type ReservationStatus,
  type Review,
  type ReviewStatus,
} from '@/lib/admin';
import type { Store, StoreHours } from '@/lib/catalog/types';

interface AdminContextValue {
  overrides: Record<string, ProductOverride>;
  reservations: Reservation[];
  reviews: Review[];
  heroProductIds: string[];
  storeSettings: Store | null;
  setInStock: (productId: string, inStock: boolean) => void;
  setPrice: (productId: string, priceCents: number) => void;
  setStaffPick: (productId: string, staffPick: boolean) => void;
  setReservationStatus: (reservationId: string, status: ReservationStatus) => void;
  setReviewStatus: (reviewId: string, status: ReviewStatus) => void;
  setHeroProducts: (productIds: string[]) => void;
  updateStoreSettings: (
    patch: Partial<Pick<Store, 'name' | 'address' | 'city' | 'province' | 'postalCode' | 'phone'>>,
  ) => void;
  updateStoreHours: (index: number, patch: Partial<StoreHours>) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

interface Props {
  children: React.ReactNode;
  /**
   * Fabricated pickup orders, generated server-side from the real catalog
   * (see lib/sample-reservations.ts) and handed down once as the starting
   * state. Nothing here is persisted — a reload regenerates the same
   * deterministic sample and drops every edit, by design.
   */
  initialReservations?: Reservation[];
  /** Fabricated reviews, generated server-side (see lib/sample-reviews.ts). */
  initialReviews?: Review[];
  /** Default landing-hero product ids (first three real products with an image). */
  initialHeroProductIds?: string[];
  /** The real store record (see data/catalog.json), edited in memory only. */
  initialStoreSettings?: Store | null;
}

export function AdminProvider({
  children,
  initialReservations = [],
  initialReviews = [],
  initialHeroProductIds = [],
  initialStoreSettings = null,
}: Props) {
  const [state, dispatch] = useReducer(adminReducer, {
    ...EMPTY_ADMIN_STATE,
    reservations: initialReservations,
    reviews: initialReviews,
    heroProductIds: initialHeroProductIds,
    storeSettings: initialStoreSettings,
  });

  const value: AdminContextValue = {
    overrides: state.overrides,
    reservations: state.reservations,
    reviews: state.reviews,
    heroProductIds: state.heroProductIds,
    storeSettings: state.storeSettings,
    setInStock: (productId, inStock) => dispatch({ type: 'setInStock', productId, inStock }),
    setPrice: (productId, priceCents) => dispatch({ type: 'setPrice', productId, priceCents }),
    setStaffPick: (productId, staffPick) => dispatch({ type: 'setStaffPick', productId, staffPick }),
    setReservationStatus: (reservationId, status) =>
      dispatch({ type: 'setReservationStatus', reservationId, status }),
    setReviewStatus: (reviewId, status) => dispatch({ type: 'setReviewStatus', reviewId, status }),
    setHeroProducts: (productIds) => dispatch({ type: 'setHeroProducts', productIds }),
    updateStoreSettings: (patch) => dispatch({ type: 'updateStoreSettings', patch }),
    updateStoreHours: (index, patch) => dispatch({ type: 'updateStoreHours', index, patch }),
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside an AdminProvider');
  return ctx;
}
