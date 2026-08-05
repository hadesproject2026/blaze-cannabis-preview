'use client';

import { useEffect, useRef, useState } from 'react';
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

const MOBILE_QUERY = '(max-width: 900px)';

/**
 * Marks everything outside `target` inert, up to (but not including) `boundary`.
 *
 * `target` (the filter sheet) lives inside #site-content alongside the rest of the
 * page, so we can't just set `inert` on #site-content — that would inert the sheet
 * too, since `inert` applies to the whole subtree with no way for a descendant to
 * opt back out. Instead we walk from `target` up to `boundary`, and at each level
 * inert the target's siblings only. That reaches every other region of the page
 * (header, toolbar, product grid, etc.) without ever touching an ancestor of the
 * sheet itself.
 */
function setInertAroundTarget(target: HTMLElement, boundary: HTMLElement): () => void {
  const inerted: Element[] = [];
  let node: Element | null = target;

  while (node && node !== boundary) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
    }
    node = parent;
  }

  return () => {
    for (const el of inerted) el.removeAttribute('inert');
  };
}

export function FilterPanel({ categories, brands, filters, onChange, isOpen, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const isSheet = isOpen && isMobile;

  useEffect(() => {
    if (!isSheet) return;

    const panel = panelRef.current;
    const siteContent = document.getElementById('site-content');

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const releaseInert = panel && siteContent ? setInertAroundTarget(panel, siteContent) : () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      releaseInert();
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [isSheet]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const dollarsToCents = (raw: string): number | null => {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100);
  };

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      data-open={isOpen}
      aria-label="Filters"
      role={isSheet ? 'dialog' : undefined}
      aria-modal={isSheet ? true : undefined}
      tabIndex={isSheet ? -1 : undefined}
    >
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
