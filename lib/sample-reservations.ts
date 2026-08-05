import type { Product } from './catalog/types';
import { effectivePriceCents } from './format';
import type { Reservation, ReservationItem, ReservationStatus } from './admin';

/**
 * Sample pickup reservations for the admin demo. There is no real ordering
 * system behind this build — these are generated from real catalog products
 * so names and prices stay consistent, but the reservations themselves are
 * fabricated. Delete this file (and its one call site in
 * components/admin/AdminProvider.tsx) to remove the seed entirely.
 */

const CUSTOMER_NAMES = [
  'Priya Nathan',
  'Marcus Webb',
  'Aiko Tanaka',
  'Sofia Reyes',
  'Derek Chen',
  'Amara Osei',
  'Liam Sullivan',
  'Nadia Farouk',
];

const STATUS_CYCLE: ReservationStatus[] = ['New', 'New', 'Ready', 'Ready', 'Ready', 'Collected', 'Collected', 'New'];

const PICKUP_DATES = [
  '2026-08-05',
  '2026-08-05',
  '2026-08-04',
  '2026-08-04',
  '2026-08-03',
  '2026-08-02',
  '2026-08-02',
  '2026-08-01',
  '2026-07-30',
  '2026-07-29',
  '2026-07-27',
  '2026-07-25',
  '2026-07-23',
  '2026-07-20',
];

// 14 orders across 8 repeating customers so the Customers surface (derived
// from this same list — see deriveCustomers in lib/admin.ts) shows real
// repeat business: some customers with one order, some with two or three.
const RESERVATION_COUNT = 14;

/** Deterministic — same catalog in, same reservations out, so tests stay stable. */
export function generateSampleReservations(products: Product[]): Reservation[] {
  const pool = products.filter((p) => p.inStock);
  const source = pool.length > 0 ? pool : products;
  if (source.length === 0) return [];

  const reservations: Reservation[] = [];

  for (let i = 0; i < RESERVATION_COUNT; i++) {
    const itemCount = (i % 3) + 1; // 1–3 items per reservation
    const items: ReservationItem[] = [];
    const usedIds = new Set<string>();

    for (let j = 0; j < itemCount; j++) {
      const product = source[(i * 7 + j * 3) % source.length];
      if (usedIds.has(product.id)) continue;
      usedIds.add(product.id);
      items.push(lineFromProduct(product, ((i + j) % 2) + 1));
    }

    // Every reservation needs at least one line — fall back to the product at
    // this index if the loop above happened to collide on every attempt.
    if (items.length === 0) {
      const product = source[i % source.length];
      items.push(lineFromProduct(product, 1));
    }

    reservations.push({
      id: `res-${i + 1}`,
      customerName: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
      items,
      totalCents: items.reduce((sum, it) => sum + it.priceCents * it.qty, 0),
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
      createdAt: PICKUP_DATES[i % PICKUP_DATES.length],
    });
  }

  return reservations;
}

function lineFromProduct(product: Product, qty: number): ReservationItem {
  return {
    productId: product.id,
    name: product.name,
    qty,
    priceCents: effectivePriceCents(product),
  };
}
