'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getGalleryStats } from '@/lib/admin';
import type { Product } from '@/lib/catalog/types';
import styles from './AdminGallery.module.css';

export function AdminGallery({ products }: { products: Product[] }) {
  const { needsPhotoIds, setNeedsPhoto } = useAdmin();

  const stats = useMemo(() => getGalleryStats(products, needsPhotoIds), [products, needsPhotoIds]);
  const missing = useMemo(() => products.filter((p) => p.images.length === 0), [products]);
  const flaggedSet = useMemo(() => new Set(needsPhotoIds), [needsPhotoIds]);

  return (
    <div className={styles.page}>
      <p className="kicker">Catalog</p>
      <h1 className={styles.title}>Gallery</h1>
      <p className={styles.lede}>
        Every product photo in the catalog, the way a shopper sees it. The supplier sheets behind
        these listings are white-background cut-outs — usable, but not photography built for a
        storefront. Flag anything that needs a proper reshoot; the product with no photo at all
        is called out below.
      </p>

      <div className={styles.summary} aria-live="polite">
        <span className={styles.summaryItem}>
          <strong>{stats.withImages}</strong> of {stats.total} products have a photo
        </span>
        <span className={styles.summaryDot} aria-hidden="true">·</span>
        <span className={styles.summaryItem}>
          <strong>{stats.flagged}</strong> flagged for reshoot
        </span>
        <span className={styles.summaryDot} aria-hidden="true">·</span>
        <span className={styles.summaryItem}>
          <strong>{stats.missing}</strong> missing entirely
        </span>
      </div>

      {missing.length > 0 && (
        <div className={styles.gapNotice} role="note">
          <strong>
            {missing.length === 1 ? 'One product has' : `${missing.length} products have`} no photo
            on file.
          </strong>{' '}
          {missing.map((p) => `${p.name} (${p.brand})`).join(', ')} — this is a genuine gap, not a
          styling issue.
        </div>
      )}

      <ul className={styles.grid}>
        {products.map((p) => {
          const hasImage = p.images.length > 0;
          const flagged = flaggedSet.has(p.id);
          return (
            <li key={p.id} className={styles.card}>
              <div className={styles.thumb} data-missing={!hasImage}>
                {hasImage ? (
                  <Image src={p.images[0]} alt="" fill sizes="180px" className={styles.thumbImg} />
                ) : (
                  <span className={styles.noPhoto}>No photo</span>
                )}
              </div>
              <span className={styles.cardName}>{p.name}</span>
              <span className={styles.cardBrand}>{p.brand}</span>

              {hasImage ? (
                <button
                  type="button"
                  className={styles.toggle}
                  data-flagged={flagged}
                  aria-pressed={flagged}
                  onClick={() => setNeedsPhoto(p.id, !flagged)}
                >
                  <span className={styles.toggleDot} aria-hidden="true" />
                  {flagged ? 'Flagged — needs new photo' : 'Flag for reshoot'}
                </button>
              ) : (
                <span className={styles.missingBadge}>Missing photo</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
