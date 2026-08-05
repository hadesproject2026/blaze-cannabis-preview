'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/components/admin/AdminProvider';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { applyOverrides } from '@/lib/admin';
import type { Category, Product } from '@/lib/catalog/types';
import { applyFilters, EMPTY_FILTERS, sortProducts, type FilterState, type SortKey } from '@/lib/filters';
import { CategoryChips } from './CategoryChips';
import { EmptyState } from './EmptyState';
import { FilterPanel } from './FilterPanel';
import { ProductGrid } from './ProductGrid';
import { SortSelect } from './SortSelect';
import styles from './MenuBrowser.module.css';

interface Props {
  products: Product[];
  categories: Category[];
  viewLabel?: string | null;
}

export function MenuBrowser({ products, categories, viewLabel }: Props) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Overlays in-memory admin edits (stock, price, Budtender Select) on top of
  // the server-fetched catalog, so a change made in /admin/products shows up
  // here immediately without a reload — see lib/admin.ts and the admin build
  // report for how this stays in sync across client-side navigation.
  const { overrides } = useAdmin();
  const overlaidProducts = useMemo(() => applyOverrides(products, overrides), [products, overrides]);

  const brands = useMemo(
    () => Array.from(new Set(overlaidProducts.map((p) => p.brand))).sort(),
    [overlaidProducts],
  );

  const visible = useMemo(
    () => sortProducts(applyFilters(overlaidProducts, filters), sort),
    [overlaidProducts, filters, sort],
  );

  const toggleCategory = (slug: string) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));

  return (
    <>
      <SiteHeader
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      />

      <main className="container" style={{ paddingTop: 28 }}>
        <p className="kicker">Pickup at Blaze Cannabis — Brampton</p>
        <div className={styles.headingRow}>
          <h1 style={{ fontSize: 34, margin: '10px 0 18px' }}>{viewLabel ?? 'The menu'}</h1>
          {viewLabel && (
            <Link href="/menu/brampton" className={styles.clearView}>Clear</Link>
          )}
        </div>

        <CategoryChips
          categories={categories}
          selected={filters.categories}
          onToggle={toggleCategory}
          onClear={() => setFilters((f) => ({ ...f, categories: [] }))}
        />

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
          </button>
          <SortSelect value={sort} onChange={setSort} />
          <span className={styles.count}>
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className={styles.layout}>
          <FilterPanel
            categories={categories}
            brands={brands}
            filters={filters}
            onChange={setFilters}
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />
          {visible.length > 0 ? (
            <ProductGrid products={visible} />
          ) : (
            <EmptyState onClear={() => setFilters(EMPTY_FILTERS)} />
          )}
        </div>
      </main>
    </>
  );
}
