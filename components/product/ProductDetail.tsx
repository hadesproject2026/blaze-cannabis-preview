'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { useCart } from '@/components/cart/CartProvider';
import { applyOverride } from '@/lib/admin';
import type { Product } from '@/lib/catalog/types';
import { formatPotencyRange, formatPrice, formatStrainType } from '@/lib/format';
import { QuantityStepper } from './QuantityStepper';
import styles from './ProductDetail.module.css';

export function ProductDetail({ product: serverProduct }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  // Overlays in-memory admin edits (name, brand, category, price, stock,
  // image, Budtender Select) on top of the server-fetched product, the same
  // way MenuBrowser does for the grid — see lib/admin.ts. This is the only
  // change made to this component for the admin overlay to reach the detail
  // page; everything else below is unchanged.
  const { overrides } = useAdmin();
  const product = useMemo(
    () => applyOverride(serverProduct, overrides[serverProduct.id]),
    [serverProduct, overrides],
  );

  const image = product.images[0] ?? null;
  const thc = formatPotencyRange(product.thc);
  const cbd = formatPotencyRange(product.cbd);

  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.media}>
        {image ? (
          <Image src={image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.image} priority />
        ) : (
          <span className={styles.fallback} aria-hidden="true">{product.brand.charAt(0)}</span>
        )}
      </div>

      <div>
        <p className={styles.brand}>{product.brand}</p>
        <h1 className={styles.name}>{product.name}</h1>

        <div className={styles.meta}>
          {product.strainType && (
            <span className={`${styles.tag} ${styles.tagAccent}`}>{formatStrainType(product.strainType)}</span>
          )}
          {thc && <span className={styles.tag}>THC {thc}</span>}
          {cbd && <span className={styles.tag}>CBD {cbd}</span>}
          <span className={styles.tag}>{product.size}</span>
        </div>

        <div className={styles.priceRow}>
          <span className={styles.price}>
            {product.salePriceCents !== null && <span className="sr-only">Sale price </span>}
            {formatPrice(product.salePriceCents ?? product.priceCents)}
          </span>
          {product.salePriceCents !== null && (
            <span className={styles.was}>
              <span className="sr-only">Regular price </span>
              {formatPrice(product.priceCents)}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <QuantityStepper value={qty} onChange={setQty} />
          <button
            type="button"
            className={styles.add}
            disabled={!product.inStock}
            onClick={() => add(product, qty)}
          >
            {product.inStock ? 'Add to cart' : 'Sold out'}
          </button>
        </div>

        <p className={styles.description}>{product.description}</p>

        {product.terpenes.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Terpenes</p>
            <div className={styles.meta}>
              {product.terpenes.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          </>
        )}

        {product.effects.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Reported effects</p>
            <div className={styles.meta}>
              {product.effects.map((e) => <span key={e} className={styles.tag}>{e}</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
