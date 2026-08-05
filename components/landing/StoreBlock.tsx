import type { Store } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './StoreBlock.module.css';

export function StoreBlock({ store }: { store: Store }) {
  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.panel}>
          <div>
            <p className="kicker">Pickup location</p>
            <h2 className={styles.name}>{store.name}</h2>
            <p className={styles.address}>
              {store.address}
              <br />
              {store.city}, {store.province} {store.postalCode}
            </p>
            <a href={`tel:${store.phone.replace(/[^0-9+]/g, '')}`} className={styles.phone}>
              {store.phone}
            </a>
          </div>

          <div>
            <p className={styles.hoursTitle}>Hours</p>
            {store.hours.map((entry) => (
              <div key={entry.day} className={styles.hourRow}>
                <span className={styles.hourDay}>{entry.day}</span>
                <span>{entry.open} – {entry.close}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
