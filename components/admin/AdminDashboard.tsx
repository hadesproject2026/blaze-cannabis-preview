'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { RealDataChip, SampleChip } from '@/components/admin/DataLabel';
import { EarningsChart } from '@/components/admin/EarningsChart';
import { SampleDataNotice } from '@/components/admin/SampleDataNotice';
import { applyOverrides, getDashboardStats } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import type { EarningsSummary } from '@/lib/sample-earnings';
import type { Category, Product, Store } from '@/lib/catalog/types';
import styles from './AdminDashboard.module.css';

interface Props {
  products: Product[];
  categories: Category[];
  store: Store | null;
  /** Fabricated — see lib/sample-earnings.ts. Not derived from admin state; regenerated per request. */
  earnings: EarningsSummary;
}

export function AdminDashboard({ products, categories, store, earnings }: Props) {
  const { overrides } = useAdmin();

  const overlaid = useMemo(() => applyOverrides(products, overrides), [products, overrides]);
  const stats = useMemo(() => getDashboardStats(overlaid), [overlaid]);

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const categoryRows = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.page}>
      <p className="kicker">Overview</p>
      <h1 className={styles.title}>Good day, {store?.name ?? 'Blaze Cannabis'}</h1>
      <p className={styles.lede}>Here&apos;s a look at how the shop is trending this week.</p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Earnings</h2>
          <SampleChip />
        </div>
        <SampleDataNotice>
          These earnings figures are fabricated for this demo — there is no real sales data behind
          this build. Nothing on this page reflects actual shop revenue.
        </SampleDataNotice>

        <div className={styles.earningsGrid}>
          <EarningsCard label="Today" caption="earnings" cents={earnings.todayCents} />
          <EarningsCard label="This week" caption="last 7 days" cents={earnings.last7DaysCents} />
          <EarningsCard label="This month" caption="last 30 days" cents={earnings.last30DaysCents} />
        </div>

        <div className={styles.chartPanel}>
          <div className={styles.chartHead}>
            <h3 className={styles.chartTitle}>Earnings — last 7 days</h3>
            <SampleChip />
          </div>
          <EarningsChart daily={earnings.daily} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Catalog snapshot</h2>
          <RealDataChip />
        </div>
        <p className={styles.realLede}>
          Computed live from the 54-product catalog — including any edits made on the Products page.
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

        <div className={styles.subsection}>
          <h3 className={styles.sectionTitle}>Products by category</h3>
          <ul className={styles.categoryList}>
            {categoryRows.map(([slug, count]) => (
              <li key={slug} className={styles.categoryRow}>
                <span>{categoryName(slug)}</span>
                <span className={styles.categoryCount}>{count}</span>
              </li>
            ))}
          </ul>
        </div>

        {store && (
          <div className={styles.subsection}>
            <h3 className={styles.sectionTitle}>Pickup location</h3>
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
          </div>
        )}
      </section>
    </div>
  );
}

function EarningsCard({ label, caption, cents }: { label: string; caption: string; cents: number }) {
  return (
    <div className={styles.earningsCard}>
      <div className={styles.earningsCardHead}>
        <span className={styles.earningsLabel}>{label}</span>
        <SampleChip />
      </div>
      <span className={styles.earningsValue}>{formatPrice(cents)}</span>
      <span className={styles.earningsCaption}>{caption}</span>
    </div>
  );
}
