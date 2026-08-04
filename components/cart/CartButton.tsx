'use client';

import { useCart } from './CartProvider';

export function CartButton({ className }: { className?: string }) {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      className={className}
      onClick={open}
      aria-label={count === 1 ? 'Open cart, 1 item' : `Open cart, ${count} items`}
    >
      Cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
