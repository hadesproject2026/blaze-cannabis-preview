'use client';

import { useState } from 'react';
import { CartButton } from '@/components/cart/CartButton';
import { AuthStatus } from './AuthStatus';
import { NavDrawer } from './NavDrawer';
import styles from './SiteHeader.module.css';

interface Props {
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function SiteHeader({ search, onSearchChange }: Props) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <button
          type="button"
          className={styles.logo}
          onClick={() => setNavOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={navOpen}
          aria-label="Open navigation menu"
        >
          BLAZE
        </button>
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
        <AuthStatus />
        <CartButton className={styles.cart} />
      </div>
      <NavDrawer isOpen={navOpen} onClose={() => setNavOpen(false)} />
    </header>
  );
}
