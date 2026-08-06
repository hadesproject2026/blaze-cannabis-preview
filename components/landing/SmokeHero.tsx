'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useInViewPaused } from '@/lib/motion/useInViewPaused';
import { usePointerParallax } from '@/lib/motion/usePointerParallax';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import styles from './SmokeHero.module.css';

/**
 * The landing hero: the client's own monochrome JUST BLAZE artwork behind three
 * layers of drifting smoke, composed as a genuine 3D scene.
 *
 * The stage rotates as one rigid body from the pointer position and each layer
 * sits at a different translateZ, so CSS perspective produces the parallax
 * rather than us animating each layer separately. That keeps it to a single
 * transform and lets the smoke pass physically between the photograph and the
 * copy instead of merely overlapping it.
 *
 * The copy deliberately lives outside the rotating stage, so text never skews.
 */
export function SmokeHero() {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const paused = useInViewPaused(heroRef);

  usePointerParallax(heroRef, { disabled: reduced });

  return (
    <section ref={heroRef} className={styles.hero} data-paused={paused}>
      <div className={styles.stage} aria-hidden="true">
        <div className={`${styles.layer} ${styles.camo}`} />
        <div className={`${styles.layer} ${styles.plate}`} />
        <div className={`${styles.layer} ${styles.scrim}`} />
        <div className={`${styles.layer} ${styles.smoke} ${styles.smoke1}`} />
        <div className={`${styles.layer} ${styles.smoke} ${styles.smoke2}`} />
        <div className={`${styles.layer} ${styles.smoke} ${styles.smoke3}`} />
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
