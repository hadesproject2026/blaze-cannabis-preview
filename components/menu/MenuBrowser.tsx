'use client';

import { useMemo, useState } from 'react';
import { SiteHeader } from '@/components/shell/SiteHeader';
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
}

export function MenuBrowser({ products, categories }: Props) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const visible = useMemo(
    () => sortProducts(applyFilters(products, filters), sort),
    [products, filters, sort],
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
        <h1 style={{ fontSize: 34, margin: '10px 0 18px' }}>The menu</h1>

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
