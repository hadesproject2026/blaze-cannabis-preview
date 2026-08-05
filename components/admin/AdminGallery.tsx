'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getHeroProducts } from '@/lib/admin';
import type { Product } from '@/lib/catalog/types';
import styles from './AdminGallery.module.css';

const MAX_HERO_PICKS = 3;

export function AdminGallery({ products }: { products: Product[] }) {
  const { heroProductIds, setHeroProducts } = useAdmin();

  const withImages = useMemo(() => products.filter((p) => p.images.length > 0), [products]);
  const currentHero = useMemo(
    () => getHeroProducts(products, heroProductIds),
    [products, heroProductIds],
  );
  const atLimit = heroProductIds.length >= MAX_HERO_PICKS;

  const toggle = (productId: string) => {
    const selected = heroProductIds.includes(productId);
    if (selected) {
      setHeroProducts(heroProductIds.filter((id) => id !== productId));
    } else if (!atLimit) {
      setHeroProducts([...heroProductIds, productId]);
    }
  };

  return (
    <div className={styles.page}>
      <p className="kicker">Landing page</p>
      <h1 className={styles.title}>Gallery</h1>
      <p className={styles.lede}>
        Blaze doesn&apos;t run a portfolio, so this surface points at the landing page&apos;s hero
        instead — the three product photos that rotate through the parallax banner. Pick up to
        {' '}{MAX_HERO_PICKS} real catalog images below; the homepage updates immediately. Nothing
        here is saved — reload and the hero resets to the catalog default.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Currently in the hero</h2>
        <ol className={styles.previewStrip}>
          {currentHero.map((p, i) => (
            <li key={p.id} className={styles.previewItem}>
              <span className={styles.previewOrder}>{i + 1}</span>
              <div className={styles.previewThumb}>
                <Image src={p.images[0]} alt="" fill sizes="96px" className={styles.thumbImg} />
              </div>
              <span className={styles.previewName}>{p.name}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <div className={styles.pickHead}>
          <h2 className={styles.sectionTitle}>Catalog images</h2>
          <span className={styles.pickCount} aria-live="polite">
            {heroProductIds.length} of {MAX_HERO_PICKS} selected
          </span>
        </div>
        {atLimit && (
          <p className={styles.limitNote}>
            The hero shows {MAX_HERO_PICKS} images at a time — remove one below before adding another.
          </p>
        )}

        <ul className={styles.grid}>
          {withImages.map((p) => {
            const selected = heroProductIds.includes(p.id);
            const disabled = !selected && atLimit;
            return (
              <li key={p.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.cardButton}
                  data-selected={selected}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggle(p.id)}
                >
                  <div className={styles.thumb}>
                    <Image src={p.images[0]} alt="" fill sizes="140px" className={styles.thumbImg} />
                    {selected && (
                      <span className={styles.badge}>{heroProductIds.indexOf(p.id) + 1}</span>
                    )}
                  </div>
                  <span className={styles.cardName}>{p.name}</span>
                  <span className={styles.cardAction}>
                    {selected ? 'Remove from hero' : 'Feature in hero'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
