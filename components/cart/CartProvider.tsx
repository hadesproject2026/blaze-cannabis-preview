'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import {
  cartCount,
  cartReducer,
  cartSubtotalCents,
  CART_STORAGE_KEY,
  type CartLine,
} from '@/lib/cart';
import type { Product } from '@/lib/catalog/types';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  /** 'mock' | 'blaze', decided server-side (CATALOG_SOURCE) and handed down as a
   * plain prop — never fetched. This is what lets checkout skip the network
   * entirely in mock mode: the client already knows there's no live store to order
   * against, with no request required to find that out. */
  catalogMode: 'mock' | 'blaze';
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  catalogMode = 'mock',
}: {
  children: React.ReactNode;
  catalogMode?: 'mock' | 'blaze';
}) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) dispatch({ type: 'hydrate', lines: JSON.parse(raw) as CartLine[] });
    } catch {
      // Corrupt or unavailable storage starts an empty cart rather than crashing.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, [lines, hydrated]);

  // Every handle handed out through context is memoized, and the value object itself
  // is memoized on top of that. This isn't just tidiness: CheckoutFlow's
  // "clear the cart once the order succeeds" effect lists `clear` in its dependency
  // array. Without stable identities here, `clear` (and the `value` object wrapping
  // it) would be a brand-new reference on every CartProvider render — and because
  // cartReducer's 'clear' case returns a fresh `[]` array every time (never bailing
  // out via Object.is), calling the unstable `clear()` from that effect would re-run
  // CartProvider, mint a new `clear`, re-trigger the effect, and loop forever the
  // first time an order actually completes.
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const add = useCallback((product: Product, qty?: number) => {
    dispatch({ type: 'add', product, qty });
    setIsOpen(true);
  }, []);
  const remove = useCallback((productId: string) => dispatch({ type: 'remove', productId }), []);
  const setQty = useCallback(
    (productId: string, qty: number) => dispatch({ type: 'setQty', productId, qty }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotalCents: cartSubtotalCents(lines),
      isOpen,
      open,
      close,
      add,
      remove,
      setQty,
      clear,
      catalogMode,
    }),
    [lines, isOpen, open, close, add, remove, setQty, clear, catalogMode],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside a CartProvider');
  return ctx;
}
