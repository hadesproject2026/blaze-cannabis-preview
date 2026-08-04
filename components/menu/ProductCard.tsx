'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import type { Product } from '@/lib/catalog/types';
import { formatPotencyRange, formatPrice, formatStrainType } from '@/lib/format';
import styles from './ProductCard.module.css';

const BADGE_LABELS: Record<string, string> = {
  'new-drop': 'New Drop',
  'on-sale': 'Sale',
  'staff-pick': 'Staff Pick',
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const image = product.images[0] ?? null;
  const potency = formatPotencyRange(product.thc);
  const spotBadges = product.badges.filter((b) => b === 'new-drop' || b === 'on-sale');

  return (
    <article className={styles.card} data-out-of-stock={!product.inStock}>
      <Link href={`/product/${product.slug}`} className={styles.media} aria-label={product.name}>
        {image ? (
          <Image src={image} alt={product.name} fill sizes="(max-width: 720px) 50vw, 25vw" className={styles.image} />
        ) : (
          <span className={styles.fallback} aria-hidden="true">{product.brand.charAt(0)}</span>
        )}
        {spotBadges.length > 0 && (
          <div className={styles.badges}>
            {spotBadges.map((badge) => (
              <span key={badge} className={styles.badge}>{BADGE_LABELS[badge]}</span>
            ))}
          </div>
        )}
        {product.strainType && (
          <span className={styles.strain}>{formatStrainType(product.strainType)}</span>
        )}
      </Link>

      <div className={styles.body}>
        {potency && <span className={styles.potency}>THC {potency}</span>}
        <span className={styles.brand}>{product.brand}</span>
        <Link href={`/product/${product.slug}`} className={styles.name}>{product.name}</Link>
        <span className={styles.size}>{product.size}</span>

        <div className={styles.footer}>
          <span className={styles.price}>
            {formatPrice(product.salePriceCents ?? product.priceCents)}
          </span>
          {product.salePriceCents !== null && (
            <span className={styles.was}>{formatPrice(product.priceCents)}</span>
          )}
          <button
            type="button"
            className={styles.add}
            disabled={!product.inStock}
            onClick={() => add(product)}
          >
            {product.inStock ? 'Add' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
