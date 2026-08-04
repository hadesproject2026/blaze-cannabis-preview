'use client';

import Link from 'next/link';
import { CartButton } from '@/components/cart/CartButton';
import styles from './SiteHeader.module.css';

interface Props {
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function SiteHeader({ search, onSearchChange }: Props) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>BLAZE</Link>
        <span className={styles.location}>Brampton · Pickup</span>
        <span className={styles.spacer} />
        {onSearchChange && (
          <input
            className={styles.search}
            type="search"
            value={search ?? ''}
            placeholder="Search the menu"
            aria-label="Search the menu"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}
        <CartButton className={styles.cart} />
      </div>
    </header>
  );
}
