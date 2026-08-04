'use client';

import { createContext, useContext, useEffect, useReducer, useState } from 'react';
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
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  const value: CartContextValue = {
    lines,
    count: cartCount(lines),
    subtotalCents: cartSubtotalCents(lines),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    add: (product, qty) => {
      dispatch({ type: 'add', product, qty });
      setIsOpen(true);
    },
    remove: (productId) => dispatch({ type: 'remove', productId }),
    setQty: (productId, qty) => dispatch({ type: 'setQty', productId, qty }),
    clear: () => dispatch({ type: 'clear' }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside a CartProvider');
  return ctx;
}
