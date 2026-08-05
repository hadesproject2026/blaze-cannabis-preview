'use client';

import { createContext, useContext, useReducer } from 'react';
import {
  adminReducer,
  EMPTY_ADMIN_STATE,
  type ProductOverride,
  type Reservation,
  type ReservationStatus,
} from '@/lib/admin';

interface AdminContextValue {
  overrides: Record<string, ProductOverride>;
  reservations: Reservation[];
  setInStock: (productId: string, inStock: boolean) => void;
  setPrice: (productId: string, priceCents: number) => void;
  setStaffPick: (productId: string, staffPick: boolean) => void;
  setReservationStatus: (reservationId: string, status: ReservationStatus) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

interface Props {
  children: React.ReactNode;
  /**
   * Fabricated pickup reservations, generated server-side from the real
   * catalog (see lib/sample-reservations.ts) and handed down once as the
   * starting state. Nothing here is persisted — a reload regenerates the
   * same deterministic sample and drops every edit, by design.
   */
  initialReservations?: Reservation[];
}

export function AdminProvider({ children, initialReservations = [] }: Props) {
  const [state, dispatch] = useReducer(adminReducer, {
    ...EMPTY_ADMIN_STATE,
    reservations: initialReservations,
  });

  const value: AdminContextValue = {
    overrides: state.overrides,
    reservations: state.reservations,
    setInStock: (productId, inStock) => dispatch({ type: 'setInStock', productId, inStock }),
    setPrice: (productId, priceCents) => dispatch({ type: 'setPrice', productId, priceCents }),
    setStaffPick: (productId, staffPick) => dispatch({ type: 'setStaffPick', productId, staffPick }),
    setReservationStatus: (reservationId, status) =>
      dispatch({ type: 'setReservationStatus', reservationId, status }),
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside an AdminProvider');
  return ctx;
}
