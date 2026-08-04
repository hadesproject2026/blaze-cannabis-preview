import type { Metadata } from 'next';
import { CartProvider } from '@/components/cart/CartProvider';
import { AgeGate } from '@/components/shell/AgeGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blaze Cannabis — Brampton',
  description: 'Browse the Blaze Cannabis Brampton menu and reserve for pickup.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <noscript>
            <style>{`#site-content { display: none !important; }`}</style>
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <h1>You must be 19 or older to view this site.</h1>
              <p>Please enable JavaScript to continue.</p>
            </div>
          </noscript>
          <AgeGate />
          <div id="site-content">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
