import Link from 'next/link';
import { ProductCard } from '@/components/menu/ProductCard';
import type { Product } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './BudtenderRail.module.css';

export function BudtenderRail({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.head}>
          <div>
            <p className="kicker">Recommended by our staff</p>
            <h2 className={styles.title}>Budtender Selects</h2>
          </div>
          <Link href="/menu/brampton" className={styles.link}>View all →</Link>
        </div>
      </Reveal>

      <div className={styles.rail}>
        {products.map((product, index) => (
          <Reveal key={product.id} delay={index * 50}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
