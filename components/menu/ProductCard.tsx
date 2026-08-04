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
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const image = product.images[0] ?? null;
  const potency = formatPotencyRange(product.thc);
  const spotBadges = product.badges.filter((b) => b === 'new-drop' || b === 'on-sale');

  return (
    <article className={styles.card} data-out-of-stock={!product.inStock}>
      <div className={styles.media}>
        <Link
          href={`/product/${product.slug}`}
          className={styles.mediaLink}
          aria-hidden="true"
          tabIndex={-1}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 25vw"
              className={styles.image}
            />
          ) : (
            <span className={styles.fallback}>{product.brand.charAt(0)}</span>
          )}
        </Link>
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
      </div>

      <div className={styles.body}>
        {potency && <span className={styles.potency}>THC {potency}</span>}
        <span className={styles.brand}>{product.brand}</span>
        <Link href={`/product/${product.slug}`} className={styles.name}>{product.name}</Link>
        <span className={styles.size}>{product.size}</span>

        <div className={styles.footer}>
          <span className={styles.price}>
            {product.salePriceCents !== null && <span className="sr-only">Sale price </span>}
            {formatPrice(product.salePriceCents ?? product.priceCents)}
          </span>
          {product.salePriceCents !== null && (
            <del className={styles.was}>
              <span className="sr-only">Regular price </span>
              {formatPrice(product.priceCents)}
            </del>
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
