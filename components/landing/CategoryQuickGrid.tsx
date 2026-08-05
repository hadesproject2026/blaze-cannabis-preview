import Link from 'next/link';
import type { Category } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './CategoryQuickGrid.module.css';

const FEATURED = ['dried-flower', 'pre-rolls', 'vape', 'edibles', 'concentrates', 'accessories'];

export function CategoryQuickGrid({ categories }: { categories: Category[] }) {
  const shown = FEATURED
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is Category => Boolean(c));

  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.head}>
          <p className="kicker">Shop by category</p>
          <h2 className={styles.title}>Find your shelf</h2>
        </div>
      </Reveal>

      <div className={styles.grid}>
        {shown.map((category, index) => (
          <Reveal key={category.slug} delay={index * 60}>
            <Link href="/menu/brampton" className={styles.tile}>
              <h3 className={styles.tileName}>{category.name}</h3>
              <p className={styles.tileBlurb}>{category.blurb}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
