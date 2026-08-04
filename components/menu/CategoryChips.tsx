'use client';

import type { Category } from '@/lib/catalog/types';
import styles from './CategoryChips.module.css';

interface Props {
  categories: Category[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
}

export function CategoryChips({ categories, selected, onToggle, onClear }: Props) {
  return (
    <div className={styles.row} role="group" aria-label="Product categories">
      <button
        type="button"
        className={styles.chip}
        aria-pressed={selected.length === 0}
        onClick={onClear}
      >
        All products
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className={styles.chip}
          aria-pressed={selected.includes(category.slug)}
          onClick={() => onToggle(category.slug)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
