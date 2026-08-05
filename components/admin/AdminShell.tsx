'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminShell.module.css';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/settings', label: 'Shop settings' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          BLAZE <span className={styles.demoTag}>Demo</span>
        </span>
        <span className={styles.subtitle}>Admin console — pitch preview, nothing here is saved</span>
      </header>

      <div className={styles.body}>
        <div className={styles.sidebarCol}>
          <p className={styles.sidebarLabel} aria-hidden="true">Owner admin</p>
          <nav className={styles.sidebar} aria-label="Owner admin">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={styles.navLink}
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <span className={styles.navSpacer} />
          <Link href="/" className={styles.backLink}>← Back to storefront</Link>
          </nav>
        </div>

        <main id="admin-main" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
