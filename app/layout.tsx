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
          <AgeGate />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
