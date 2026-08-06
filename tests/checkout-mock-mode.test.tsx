import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider, useCart } from '@/components/cart/CartProvider';
import type { Product } from '@/lib/catalog/types';

// The phase design requires: when CATALOG_SOURCE is unset/mock, checkout must stay
// entirely local — no fetch to our own /api/checkout route, let alone to BLAZE ECOM.
// CartDrawer only ever renders CheckoutFlow (the component that calls fetch) when
// catalogMode === 'blaze' — this test proves that wiring holds by driving the actual
// components rather than asserting on the mode string alone.

const testProduct: Product = {
  id: 'test-product-1',
  slug: 'test-product-1',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'flower',
  strainType: null,
  thc: null,
  cbd: null,
  size: '1g',
  priceCents: 1000,
  salePriceCents: null,
  inStock: true,
  images: [],
  description: '',
  terpenes: [],
  effects: [],
  badges: [],
  addedAt: '',
};

function AddToCartButton() {
  const { add } = useCart();
  return <button onClick={() => add(testProduct)}>Add test product</button>;
}

function Harness({ catalogMode }: { catalogMode: 'mock' | 'blaze' }) {
  return (
    <CartProvider catalogMode={catalogMode}>
      <AddToCartButton />
      <CartDrawer />
    </CartProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('mock mode never touches the network', () => {
  it('completes the demo "Reserve for pickup" confirmation with zero fetch calls', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(<Harness catalogMode="mock" />);
    await user.click(screen.getByText('Add test product'));
    await user.click(screen.getByRole('button', { name: /reserve for pickup/i }));

    expect(await screen.findByText(/we'll hold it for you/i)).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('never renders a "Checkout" button in mock mode', async () => {
    const user = userEvent.setup();
    render(<Harness catalogMode="mock" />);
    await user.click(screen.getByText('Add test product'));
    expect(screen.queryByRole('button', { name: /^checkout$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve for pickup/i })).toBeInTheDocument();
  });
});

describe('blaze mode enables the real checkout entry point', () => {
  it('shows "Checkout" instead of "Reserve for pickup", and does not call fetch just by opening it', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(<Harness catalogMode="blaze" />);
    await user.click(screen.getByText('Add test product'));
    expect(screen.queryByRole('button', { name: /reserve for pickup/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^checkout$/i }));
    expect(await screen.findByRole('heading', { name: /contact details/i })).toBeInTheDocument();
    // Reaching the contact form is a pure client-side step transition — the network
    // call only happens after review, on "Place order".
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
