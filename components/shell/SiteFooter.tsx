import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.row}`}>
        <span className={styles.brand}>BLAZE</span>
        <span className={styles.spacer} />
        <p className={styles.legal}>
          Must be 19+ with valid government-issued ID to purchase. Please consume responsibly.
        </p>
      </div>
    </footer>
  );
}
