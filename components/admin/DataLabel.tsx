import styles from './DataLabel.module.css';

/** Small inline marker for a fabricated figure — pairs with SampleDataNotice. */
export function SampleChip() {
  return <span className={styles.chip + ' ' + styles.sample}>Sample data</span>;
}

/** Small inline marker for a figure computed live from the real catalog. */
export function RealDataChip({ children = 'Real catalog data' }: { children?: React.ReactNode }) {
  return <span className={styles.chip + ' ' + styles.real}>{children}</span>;
}
