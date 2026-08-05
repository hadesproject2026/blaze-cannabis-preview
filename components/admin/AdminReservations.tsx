'use client';

import { useAdmin } from '@/components/admin/AdminProvider';
import type { ReservationStatus } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import styles from './AdminReservations.module.css';

const STATUSES: ReservationStatus[] = ['New', 'Ready', 'Collected'];

export function AdminReservations() {
  const { reservations, setReservationStatus } = useAdmin();

  return (
    <div className={styles.page}>
      <p className="kicker">Pickup</p>
      <h1 className={styles.title}>Reservations</h1>

      <div className={styles.sampleNotice} role="note">
        <strong>Sample data.</strong> These {reservations.length} reservations are fabricated for this
        demo — built from real catalog products so names and prices line up, but no real orders exist
        in this build.
      </div>

      <ul className={styles.list}>
        {reservations.map((r) => (
          <li key={r.id} className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <p className={styles.customer}>{r.customerName}</p>
                <p className={styles.meta}>Reservation {r.id.replace('res-', '#')} · {r.createdAt}</p>
              </div>
              <label className={styles.statusField} data-status={r.status}>
                <span className="sr-only">Status for {r.customerName}&apos;s reservation</span>
                <select
                  className={styles.statusSelect}
                  value={r.status}
                  onChange={(e) => setReservationStatus(r.id, e.target.value as ReservationStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <ul className={styles.items}>
              {r.items.map((item) => (
                <li key={item.productId} className={styles.item}>
                  <span>{item.qty}× {item.name}</span>
                  <span>{formatPrice(item.priceCents * item.qty)}</span>
                </li>
              ))}
            </ul>

            <div className={styles.total}>
              <span>Total</span>
              <span>{formatPrice(r.totalCents)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
