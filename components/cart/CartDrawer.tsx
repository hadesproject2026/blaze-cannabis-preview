'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { useCart } from './CartProvider';
import styles from './CartDrawer.module.css';

/**
 * The drawer is now a fast preview-and-adjust surface only. Checking out — review,
 * pickup details, payment method, confirmation — happens on the dedicated /checkout
 * route (components/cart/CheckoutFlow.tsx), which is shared by both catalog modes.
 * This keeps the drawer itself identical for mock and blaze: it always says
 * "Checkout" and always just navigates, never posting anything or clearing the
 * cart itself. See CheckoutFlow.tsx for where mock vs blaze actually diverge.
 */
export function CartDrawer() {
  const { lines, subtotalCents, isOpen, close, setQty, remove } = useCart();
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [focusResetToken, setFocusResetToken] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  // Same inert-based approach as AgeGate: CartDrawer is mounted as a sibling of
  // #site-content (see app/layout.tsx), so there's no need to walk siblings the
  // way FilterPanel does — inerting #site-content directly reaches the whole page
  // behind the drawer without touching the drawer itself.
  useEffect(() => {
    if (!isOpen) return;
    const content = document.getElementById('site-content');
    if (!content) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    content.setAttribute('inert', '');
    closeRef.current?.focus();

    return () => {
      content.removeAttribute('inert');
      openerRef.current?.focus();
      openerRef.current = null;
    };
  }, [isOpen]);

  // Removing a line or decrementing a quantity-1 line down to zero deletes the
  // DOM node the click came from; the browser would otherwise drop focus to
  // <body>. Send it somewhere deliberate instead — the close button always
  // exists and keeps the user inside the dialog. Keyed on a token bumped from
  // the handlers below, so this runs after React commits the removal rather
  // than targeting an element that's about to unmount.
  useEffect(() => {
    if (focusResetToken === 0) return;
    closeRef.current?.focus();
  }, [focusResetToken]);

  const removeLine = (productId: string) => {
    remove(productId);
    setFocusResetToken((t) => t + 1);
  };

  const decrementQty = (productId: string, qty: number) => {
    setQty(productId, qty - 1);
    if (qty - 1 <= 0) setFocusResetToken((t) => t + 1);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="Cart">
        <div className={styles.head}>
          <h2 className={styles.title}>Your cart</h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label="Close cart">×</button>
        </div>

        <div className={styles.lines}>
          {lines.length === 0 ? (
            <p className={styles.empty}>Your cart is empty.</p>
          ) : (
            lines.map((line) => (
              <div key={line.productId} className={styles.line}>
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.thumb} aria-hidden="true" />
                )}
                <div style={{ flex: 1 }}>
                  <p className={styles.lineBrand}>{line.brand}</p>
                  <p className={styles.lineName}>{line.name}</p>
                  <div className={styles.qtyRow}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      aria-label={`Decrease quantity of ${line.name}`}
                      onClick={() => decrementQty(line.productId, line.qty)}
                    >
                      −
                    </button>
                    <span style={{ fontSize: 13, minWidth: 18, textAlign: 'center' }}>{line.qty}</span>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      aria-label={`Increase quantity of ${line.name}`}
                      onClick={() => setQty(line.productId, line.qty + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      style={{ marginLeft: 4 }}
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeLine(line.productId)}
                    >
                      ×
                    </button>
                    <span className={styles.linePrice}>{formatPrice(line.priceCents * line.qty)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.foot}>
          <div className={styles.subtotal}>
            <span>Subtotal</span>
            <span className={styles.subtotalValue}>{formatPrice(subtotalCents)}</span>
          </div>
          <p className={styles.note}>Taxes calculated in store. Payment on pickup.</p>
          <button
            type="button"
            className={styles.reserve}
            disabled={lines.length === 0}
            onClick={() => {
              close();
              router.push('/checkout');
            }}
          >
            Checkout
          </button>
        </div>
      </aside>
    </>
  );
}
