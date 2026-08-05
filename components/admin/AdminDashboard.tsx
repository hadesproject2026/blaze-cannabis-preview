'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { applyOverrides, getDashboardStats } from '@/lib/admin';
import type { Category, Product, Store } from '@/lib/catalog/types';
import styles from './AdminDashboard.module.css';

interface Props {
  products: Product[];
  categories: Category[];
  store: Store | null;
}

export function AdminDashboard({ products, categories, store }: Props) {
  const { overrides } = useAdmin();

  const overlaid = useMemo(() => applyOverrides(products, overrides), [products, overrides]);
  const stats = useMemo(() => getDashboardStats(overlaid), [overlaid]);

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const categoryRows = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.page}>
      <p className="kicker">Overview</p>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.lede}>
        Figures are computed live from the catalog — including any edits made on the Products page.
      </p>

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total products</span>
          <span className={styles.cardValue}>{stats.total}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Out of stock</span>
          <span className={styles.cardValue}>{stats.outOfStock}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>On sale</span>
          <span className={styles.cardValue}>{stats.onSale}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Budtender Selects</span>
          <span className={styles.cardValue}>{stats.budtenderSelects}</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Products by category</h2>
        <ul className={styles.categoryList}>
          {categoryRows.map(([slug, count]) => (
            <li key={slug} className={styles.categoryRow}>
              <span>{categoryName(slug)}</span>
              <span className={styles.categoryCount}>{count}</span>
            </li>
          ))}
        </ul>
      </section>

      {store && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pickup location</h2>
          <div className={styles.storePanel}>
            <div>
              <p className={styles.storeName}>{store.name}</p>
              <p className={styles.storeAddress}>
                {store.address}
                <br />
                {store.city}, {store.province} {store.postalCode}
              </p>
              <a href={`tel:${store.phone.replace(/[^0-9+]/g, '')}`} className={styles.storePhone}>
                {store.phone}
              </a>
            </div>
            <div>
              <p className={styles.hoursTitle}>Hours</p>
              {store.hours.map((entry) => (
                <div key={entry.day} className={styles.hourRow}>
                  <span className={styles.hourDay}>{entry.day}</span>
                  <span>{entry.open} – {entry.close}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
