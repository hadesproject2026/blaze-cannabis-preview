import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/cart/CheckoutFlow';
import { getCatalogSource } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Checkout (Demo) — Blaze Cannabis',
};

/**
 * Server component so the confirmation step's pickup address (store.name /
 * store.address / store.city etc.) is available without a client-side fetch —
 * mirrors how app/page.tsx and app/layout.tsx already resolve the Brampton
 * store via getCatalogSource().getStore(). CheckoutFlow itself stays a client
 * component (it needs cart state, form state, and router navigation); this
 * page just hands it the one server-fetched value it needs.
 */
export default async function CheckoutPage() {
  const store = await getCatalogSource().getStore('brampton');
  return <CheckoutFlow store={store} />;
}
