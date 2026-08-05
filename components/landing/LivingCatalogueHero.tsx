'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useInViewPaused } from '@/lib/motion/useInViewPaused';
import { usePointerParallax } from '@/lib/motion/usePointerParallax';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import type { Product } from '@/lib/catalog/types';
import styles from './LivingCatalogueHero.module.css';

const MOTES = [
  { left: '26%', duration: '7s', delay: '0s' },
  { left: '39%', duration: '9s', delay: '1.6s' },
  { left: '52%', duration: '8s', delay: '3.1s' },
  { left: '68%', duration: '10s', delay: '0.8s' },
  { left: '81%', duration: '7.5s', delay: '4.2s' },
  { left: '33%', duration: '11s', delay: '5.4s' },
];

const LAYER_CLASSES = [styles.l1, styles.l2, styles.l3];

export function LivingCatalogueHero({ products }: { products: Product[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const paused = useInViewPaused(heroRef);
  usePointerParallax(heroRef, { disabled: reduced });

  return (
    <section ref={heroRef} className={styles.hero} data-paused={paused}>
      <div className={`${styles.smoke} ${styles.smokeA}`} aria-hidden="true" />
      <div className={`${styles.smoke} ${styles.smokeB}`} aria-hidden="true" />
      <div className={styles.shaft} aria-hidden="true" />

      <div className={styles.stage} aria-hidden="true">
        {MOTES.map((mote, index) => (
          <span
            key={index}
            className={styles.mote}
            style={{
              left: mote.left,
              bottom: '-4%',
              animationDuration: mote.duration,
              animationDelay: mote.delay,
            }}
          />
        ))}

        {products.slice(0, 3).map((product, index) => (
          <div key={product.id} className={`${styles.layer} ${LAYER_CLASSES[index]}`}>
            <div className={styles.layerInner}>
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" loading="eager" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`container ${styles.copy}`}>
        <div className={`hairline ${styles.rule}`} />
        <p className="kicker">Now open · Brampton</p>
        <h1 className={styles.h1}>Curated, not stocked.</h1>
        <p className={styles.lede}>
          Every shelf is picked by our budtenders. Browse the Brampton menu, reserve what you
          want, and collect it in store.
        </p>
        <Link href="/menu/brampton" className={styles.cta}>Browse the menu</Link>
      </div>
    </section>
  );
}
