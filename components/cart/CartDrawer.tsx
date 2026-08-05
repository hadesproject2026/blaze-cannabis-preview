'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useCart } from './CartProvider';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const { lines, subtotalCents, isOpen, close, setQty, remove, clear } = useCart();
  const [reserved, setReserved] = useState(false);

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

  useEffect(() => { if (!isOpen) setReserved(false); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="Cart">
        <div className={styles.head}>
          <h2 className={styles.title}>{reserved ? 'Reserved' : 'Your cart'}</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close cart">×</button>
        </div>

        {reserved ? (
          <div className={styles.confirmed}>
            <p className="kicker">Ready for pickup</p>
            <h3 style={{ fontSize: 22, margin: '10px 0 10px' }}>We&apos;ll hold it for you</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              Bring valid government-issued ID to the Brampton store. Payment is completed in person.
            </p>
          </div>
        ) : (
          <>
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
                          onClick={() => setQty(line.productId, line.qty - 1)}
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
                          onClick={() => remove(line.productId)}
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
                onClick={() => { setReserved(true); clear(); }}
              >
                Reserve for pickup
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
