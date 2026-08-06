import type { Metadata } from 'next';
import { AdminProvider } from '@/components/admin/AdminProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider } from '@/components/cart/CartProvider';
import { AgeGate } from '@/components/shell/AgeGate';
import { getCatalogMode, getCatalogSource } from '@/lib/catalog';
import { getDefaultHeroProductIds } from '@/lib/admin';
import { generateSampleReservations } from '@/lib/sample-reservations';
import { generateSampleReviews } from '@/lib/sample-reviews';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blaze Cannabis — Brampton',
  description: 'Browse the Blaze Cannabis Brampton menu and reserve for pickup.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // AdminProvider is mounted here, above every route, so the admin overlay
  // (product overrides, order statuses, review visibility, hero picks, shop
  // settings) survives client-side navigation between /admin and the
  // storefront within a session — the whole point of the admin demo. Every
  // fabricated seed below is generated once from the real catalog/store and
  // handed down as starting state; nothing is persisted.
  const source = getCatalogSource();
  const catalogMode = getCatalogMode();
  const [products, store] = await Promise.all([source.listProducts(), source.getStore('brampton')]);
  const initialReservations = generateSampleReservations(products);
  const initialReviews = generateSampleReviews(products);
  const initialHeroProductIds = getDefaultHeroProductIds(products);

  return (
    <html lang="en">
      <body>
        <AdminProvider
          initialReservations={initialReservations}
          initialReviews={initialReviews}
          initialHeroProductIds={initialHeroProductIds}
          initialStoreSettings={store}
        >
          <CartProvider catalogMode={catalogMode}>
            <noscript>
              <style>{`#site-content { display: none !important; }`}</style>
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <h1>You must be 19 or older to view this site.</h1>
                <p>Please enable JavaScript to continue.</p>
              </div>
            </noscript>
            <AgeGate />
            <div id="site-content">{children}</div>
            <CartDrawer />
          </CartProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
