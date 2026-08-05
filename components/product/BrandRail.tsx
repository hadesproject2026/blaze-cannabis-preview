import { ProductCard } from '@/components/menu/ProductCard';
import type { Product } from '@/lib/catalog/types';
import styles from './BrandRail.module.css';

interface Props {
  brand: string;
  products: Product[];
}

export function BrandRail({ brand, products }: Props) {
  if (products.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>More from {brand}</h2>
      </div>
      <div className={styles.rail}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
