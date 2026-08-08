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
  needsPhotoIds: string[];
  storeSettings: Store | null;
  setInStock: (productId: string, inStock: boolean) => void;
  setPrice: (productId: string, priceCents: number) => void;
  setStaffPick: (productId: string, staffPick: boolean) => void;
  setName: (productId: string, name: string | undefined) => void;
  setBrand: (productId: string, brand: string | undefined) => void;
  setCategory: (productId: string, category: string | undefined) => void;
  setImage: (productId: string, imageDataUrl: string | undefined) => void;
  resetOverrides: () => void;
  setReservationStatus: (reservationId: string, status: ReservationStatus) => void;
  setReviewStatus: (reviewId: string, status: ReviewStatus) => void;
  setNeedsPhoto: (productId: string, needsPhoto: boolean) => void;
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
  /** The real store record (see data/catalog.json), edited in memory only. */
  initialStoreSettings?: Store | null;
}

export function AdminProvider({
  children,
  initialReservations = [],
  initialReviews = [],
  initialStoreSettings = null,
}: Props) {
  const [state, dispatch] = useReducer(adminReducer, {
    ...EMPTY_ADMIN_STATE,
    reservations: initialReservations,
    reviews: initialReviews,
    storeSettings: initialStoreSettings,
  });

  const value: AdminContextValue = {
    overrides: state.overrides,
    reservations: state.reservations,
    reviews: state.reviews,
    needsPhotoIds: state.needsPhotoIds,
    storeSettings: state.storeSettings,
    setInStock: (productId, inStock) => dispatch({ type: 'setInStock', productId, inStock }),
    setPrice: (productId, priceCents) => dispatch({ type: 'setPrice', productId, priceCents }),
    setStaffPick: (productId, staffPick) => dispatch({ type: 'setStaffPick', productId, staffPick }),
    setName: (productId, name) => dispatch({ type: 'setName', productId, name }),
    setBrand: (productId, brand) => dispatch({ type: 'setBrand', productId, brand }),
    setCategory: (productId, category) => dispatch({ type: 'setCategory', productId, category }),
    setImage: (productId, imageDataUrl) => dispatch({ type: 'setImage', productId, imageDataUrl }),
    resetOverrides: () => dispatch({ type: 'resetOverrides' }),
    setReservationStatus: (reservationId, status) =>
      dispatch({ type: 'setReservationStatus', reservationId, status }),
    setReviewStatus: (reviewId, status) => dispatch({ type: 'setReviewStatus', reviewId, status }),
    setNeedsPhoto: (productId, needsPhoto) => dispatch({ type: 'setNeedsPhoto', productId, needsPhoto }),
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
