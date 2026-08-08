import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider, useCart } from '@/components/cart/CartProvider';
import { CheckoutFlow } from '@/components/cart/CheckoutFlow';
import type { Product } from '@/lib/catalog/types';

// Checkout used to live entirely inside the cart drawer, diverging by catalog mode:
// mock mode confirmed inline ("Reserve for pickup"), blaze mode alone had a real
// "Checkout" entry point. That design was deliberately replaced — both modes now
// share the same full-page /checkout journey (CheckoutFlow), and the drawer itself
// is identical in both modes: it always says "Checkout" and only ever navigates,
// never fetches or clears the cart itself. The one assertion worth preserving from
// the old suite is still the load-bearing one: mock mode must never touch the
// network, from opening the drawer all the way through a completed confirmation.
// That invariant is re-proven below against the new UI/copy instead of the old.

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

function DrawerHarness({ catalogMode }: { catalogMode: 'mock' | 'blaze' }) {
  return (
    <CartProvider catalogMode={catalogMode}>
      <AddToCartButton />
      <CartDrawer />
    </CartProvider>
  );
}

// Mirrors the real /checkout route's composition (app/checkout/page.tsx): the
// CartProvider lives above it, CheckoutFlow is the only thing rendered inside.
// `store={null}` is fine here — these tests don't assert on the pickup address,
// that's covered by browser verification.
function CheckoutHarness({ catalogMode }: { catalogMode: 'mock' | 'blaze' }) {
  return (
    <CartProvider catalogMode={catalogMode}>
      <AddToCartButton />
      <CheckoutFlow store={null} />
    </CartProvider>
  );
}

async function fillContactAndContinue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /continue to pickup details/i }));
  await screen.findByRole('heading', { name: /pickup details/i });
  await user.type(screen.getByLabelText('Name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Phone'), '9055550199');
  await user.type(screen.getByLabelText('Email'), 'jane@example.com');
  await user.click(screen.getByRole('button', { name: /continue to payment/i }));
  await screen.findByRole('heading', { name: /^payment$/i });
}

beforeEach(() => {
  window.localStorage.clear();
  pushMock.mockClear();
});

describe('cart drawer checkout entry point', () => {
  it.each(['mock', 'blaze'] as const)(
    'renders "Checkout" (not "Reserve for pickup") in %s mode, and clicking it navigates to /checkout without calling fetch',
    async (catalogMode) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const user = userEvent.setup();

      render(<DrawerHarness catalogMode={catalogMode} />);
      await user.click(screen.getByText('Add test product'));

      expect(screen.queryByRole('button', { name: /reserve for pickup/i })).not.toBeInTheDocument();
      const checkoutBtn = screen.getByRole('button', { name: /^checkout$/i });

      await user.click(checkoutBtn);

      expect(pushMock).toHaveBeenCalledWith('/checkout');
      expect(fetchSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    },
  );
});

describe('mock mode performs the full demo checkout with zero network calls', () => {
  it('completes review, details, and payment, and shows the demo confirmation without ever calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(<CheckoutHarness catalogMode="mock" />);
    await user.click(screen.getByText('Add test product'));

    await screen.findByRole('heading', { name: /review your order/i });
    await fillContactAndContinue(user);

    // Mock mode's payment step never mentions "Place order" — that copy is
    // reserved for the live BLAZE ECOM path.
    expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm order/i }));

    expect(await screen.findByRole('heading', { name: /we'll have it ready/i })).toBeInTheDocument();
    expect(screen.getByText(/order ref\. demo-/i)).toBeInTheDocument();
    // The persistent demo marker (matching the admin's DEMO badge treatment) is
    // present throughout, and is still there on the confirmation itself.
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe('blaze mode only calls the network once "Place order" is clicked', () => {
  it('does not call fetch just by reaching the payment step', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(<CheckoutHarness catalogMode="blaze" />);
    await user.click(screen.getByText('Add test product'));

    await screen.findByRole('heading', { name: /review your order/i });
    await fillContactAndContinue(user);

    expect(screen.queryByRole('button', { name: /confirm order/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('calls /api/checkout only after "Place order" is clicked', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'ok', orderNumber: 'BZ-1', cartUuid: 'cart-1', totalCents: 1000 }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(<CheckoutHarness catalogMode="blaze" />);
    await user.click(screen.getByText('Add test product'));

    await screen.findByRole('heading', { name: /review your order/i });
    await fillContactAndContinue(user);
    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByRole('heading', { name: /we'll have it ready/i })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/checkout', expect.objectContaining({ method: 'POST' }));

    vi.unstubAllGlobals();
  });
});
