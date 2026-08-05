import styles from './SampleDataNotice.module.css';

/**
 * The one on-screen label required wherever this admin demo shows fabricated
 * numbers (earnings, orders, customers, reviews). Nothing in this build is
 * real revenue or a real customer — this notice says so in the same place
 * the figures appear, so nobody mistakes a generated number for the shop's
 * actual performance.
 */
export function SampleDataNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.notice} role="note">
      <strong>Sample data.</strong> {children}
    </div>
  );
}
