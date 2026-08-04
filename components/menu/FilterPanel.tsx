'use client';

import type { Category, StrainType } from '@/lib/catalog/types';
import type { FilterState } from '@/lib/filters';
import styles from './FilterPanel.module.css';

const STRAINS: { value: StrainType; label: string }[] = [
  { value: 'indica-dominant', label: 'Indica Dominant' },
  { value: 'sativa-dominant', label: 'Sativa Dominant' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cbd', label: 'CBD' },
];

interface Props {
  categories: Category[];
  brands: string[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({ categories, brands, filters, onChange, isOpen, onClose }: Props) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const dollarsToCents = (raw: string): number | null => {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100);
  };

  return (
    <aside className={styles.panel} data-open={isOpen} aria-label="Filters">
      <div className={styles.group}>
        <p className={styles.legend}>Category</p>
        {categories.map((category) => (
          <label key={category.slug} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.categories.includes(category.slug)}
              onChange={() => onChange({ ...filters, categories: toggle(filters.categories, category.slug) })}
            />
            {category.name}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Strain type</p>
        {STRAINS.map((strain) => (
          <label key={strain.value} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.strainTypes.includes(strain.value)}
              onChange={() => onChange({ ...filters, strainTypes: toggle(filters.strainTypes, strain.value) })}
            />
            {strain.label}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Brand</p>
        {brands.map((brand) => (
          <label key={brand} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.brands.includes(brand)}
              onChange={() => onChange({ ...filters, brands: toggle(filters.brands, brand) })}
            />
            {brand}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Price ($)</p>
        <div className={styles.range}>
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Minimum price in dollars"
            value={filters.priceMinCents === null ? '' : filters.priceMinCents / 100}
            onChange={(e) => onChange({ ...filters, priceMinCents: dollarsToCents(e.target.value) })}
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Maximum price in dollars"
            value={filters.priceMaxCents === null ? '' : filters.priceMaxCents / 100}
            onChange={(e) => onChange({ ...filters, priceMaxCents: dollarsToCents(e.target.value) })}
          />
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>THC (mg/g)</p>
        <div className={styles.range}>
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Minimum THC in milligrams per gram"
            value={filters.thcMinMgPerG ?? ''}
            onChange={(e) =>
              onChange({ ...filters, thcMinMgPerG: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Maximum THC in milligrams per gram"
            value={filters.thcMaxMgPerG ?? ''}
            onChange={(e) =>
              onChange({ ...filters, thcMaxMgPerG: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
          />
          In stock only
        </label>
      </div>

      <button type="button" className={styles.close} onClick={onClose}>Show results</button>
    </aside>
  );
}
