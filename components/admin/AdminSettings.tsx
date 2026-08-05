'use client';

import { useAdmin } from '@/components/admin/AdminProvider';
import styles from './AdminSettings.module.css';

export function AdminSettings() {
  const { storeSettings, updateStoreSettings, updateStoreHours } = useAdmin();

  return (
    <div className={styles.page}>
      <p className="kicker">Shop</p>
      <h1 className={styles.title}>Shop settings</h1>
      <p className={styles.lede}>
        Seeded from the real store listing. Edits apply immediately for this session only — reload
        the page and every field resets to the real record. Nothing here is saved.
      </p>

      {!storeSettings ? (
        <p className={styles.empty}>No store record is available for this demo.</p>
      ) : (
        <div className={styles.form}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Store details</h2>

            <div className={styles.field}>
              <label htmlFor="store-name" className={styles.label}>Store name</label>
              <input
                id="store-name"
                type="text"
                className={styles.input}
                value={storeSettings.name}
                onChange={(e) => updateStoreSettings({ name: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="store-address" className={styles.label}>Street address</label>
              <input
                id="store-address"
                type="text"
                className={styles.input}
                value={storeSettings.address}
                onChange={(e) => updateStoreSettings({ address: e.target.value })}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="store-city" className={styles.label}>City</label>
                <input
                  id="store-city"
                  type="text"
                  className={styles.input}
                  value={storeSettings.city}
                  onChange={(e) => updateStoreSettings({ city: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="store-province" className={styles.label}>Province</label>
                <input
                  id="store-province"
                  type="text"
                  className={styles.input}
                  value={storeSettings.province}
                  onChange={(e) => updateStoreSettings({ province: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="store-postal" className={styles.label}>Postal code</label>
                <input
                  id="store-postal"
                  type="text"
                  className={styles.input}
                  value={storeSettings.postalCode}
                  onChange={(e) => updateStoreSettings({ postalCode: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="store-phone" className={styles.label}>Phone</label>
              <input
                id="store-phone"
                type="tel"
                className={styles.input}
                value={storeSettings.phone}
                onChange={(e) => updateStoreSettings({ phone: e.target.value })}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Hours</h2>
            {storeSettings.hours.map((entry, index) => (
              <div key={index} className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor={`hours-day-${index}`} className={styles.label}>Days</label>
                  <input
                    id={`hours-day-${index}`}
                    type="text"
                    className={styles.input}
                    value={entry.day}
                    onChange={(e) => updateStoreHours(index, { day: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`hours-open-${index}`} className={styles.label}>Opens</label>
                  <input
                    id={`hours-open-${index}`}
                    type="text"
                    className={styles.input}
                    value={entry.open}
                    onChange={(e) => updateStoreHours(index, { open: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`hours-close-${index}`} className={styles.label}>Closes</label>
                  <input
                    id={`hours-close-${index}`}
                    type="text"
                    className={styles.input}
                    value={entry.close}
                    onChange={(e) => updateStoreHours(index, { close: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
