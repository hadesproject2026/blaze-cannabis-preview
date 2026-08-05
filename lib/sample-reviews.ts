import type { Product } from './catalog/types';
import type { Review, ReviewStatus } from './admin';

/**
 * Fabricated product reviews for the admin demo. There is no real review
 * system behind this build — these reference real catalog products so names
 * line up, but the reviewers, ratings, dates, and comments are invented.
 * Delete this file (and its one call site in components/admin/AdminProvider.tsx)
 * to remove the seed entirely.
 *
 * Comment copy deliberately avoids any health or lifestyle claim (AGCO) —
 * it stays about product quality, packaging, price, and service.
 */

const AUTHORS = [
  'Jordan K.',
  'Priya S.',
  'Marcus T.',
  'Aiko N.',
  'Sofia M.',
  'Derek W.',
  'Amara O.',
  'Liam P.',
  'Nadia F.',
  'Chris B.',
];

const RATING_CYCLE: Review['rating'][] = [5, 4, 5, 3, 5, 4, 2, 5, 4, 5];

const COMMENTS = [
  'Fresh product and the packaging was sealed well.',
  'Quick pickup, friendly staff — would order from here again.',
  'Good selection at this location, always something new on the shelf.',
  'Price matched what was listed online, no surprises at pickup.',
  'Store was clean and the staff answered every question I had.',
  'Packaging kept everything fresh on the drive home.',
  'Easy to reserve online and pickup was ready right on time.',
  'Selection here beats the other shops nearby.',
  'Staff walked me through the options without any pressure.',
  'Solid value for the size — happy with this order.',
];

const STATUS_CYCLE: ReviewStatus[] = [
  'Published',
  'Published',
  'Published',
  'Hidden',
  'Published',
  'Published',
  'Hidden',
  'Published',
  'Published',
  'Published',
];

const REVIEW_DATES = [
  '2026-07-16',
  '2026-07-20',
  '2026-07-23',
  '2026-07-26',
  '2026-07-29',
  '2026-07-31',
  '2026-08-01',
  '2026-08-02',
  '2026-08-04',
  '2026-08-05',
];

/** Deterministic — same catalog in, same reviews out, so tests stay stable. */
export function generateSampleReviews(products: Product[]): Review[] {
  if (products.length === 0) return [];

  return AUTHORS.map((author, i) => {
    const product = products[(i * 11 + 3) % products.length];
    return {
      id: `rev-${i + 1}`,
      author,
      rating: RATING_CYCLE[i % RATING_CYCLE.length],
      productId: product.id,
      productName: product.name,
      comment: COMMENTS[i % COMMENTS.length],
      date: REVIEW_DATES[i % REVIEW_DATES.length],
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    };
  });
}
