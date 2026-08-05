'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { SampleDataNotice } from '@/components/admin/SampleDataNotice';
import { deriveCustomers } from '@/lib/admin';
import { formatPrice } from '@/lib/format';
import styles from './AdminCustomers.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T12:00:00`));
}

export function AdminCustomers() {
  const { reservations } = useAdmin();
  const customers = useMemo(() => deriveCustomers(reservations), [reservations]);

  return (
    <div className={styles.page}>
      <p className="kicker">People</p>
      <h1 className={styles.title}>Customers</h1>

      <SampleDataNotice>
        These {customers.length} customers are fabricated for this demo, grouped from the same sample
        orders shown on the Orders page — names and totals reconcile between the two, but no real
        customer data exists in this build.
      </SampleDataNotice>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="sr-only">Sample customers with order count, total spent, and last order date</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Orders</th>
              <th scope="col">Total spent</th>
              <th scope="col">Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.name} className={styles.row}>
                <td className={styles.nameCell}>{c.name}</td>
                <td>{c.orderCount}</td>
                <td className={styles.totalCell}>{formatPrice(c.totalCents)}</td>
                <td className={styles.mutedCell}>{formatDate(c.lastOrderDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className={styles.empty}>No sample orders yet.</p>}
      </div>
    </div>
  );
}
