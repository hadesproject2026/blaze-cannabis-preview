import type { Product } from './catalog/types';
import { effectivePriceCents } from './format';

/**
 * Fabricated daily earnings for the admin dashboard demo. There is no real
 * sales data behind this build — the scale of the numbers is derived from
 * the real catalog's average price so the figures feel plausible, but every
 * dollar amount here is invented. Delete this file (and its one call site in
 * app/admin/page.tsx) to remove the seed entirely.
 */

export interface DailyEarning {
  date: string;
  /** Short weekday label ("Thu") for the chart's x-axis. */
  label: string;
  amountCents: number;
}

export interface EarningsSummary {
  todayCents: number;
  last7DaysCents: number;
  last30DaysCents: number;
  /** Oldest first, ending on "today" — exactly 7 entries. */
  daily: DailyEarning[];
}

// Fixed calendar dates rather than `new Date()` so the same run always
// produces the same chart — no reliance on the system clock at request time.
const EARNINGS_DATES = [
  '2026-07-30',
  '2026-07-31',
  '2026-08-01',
  '2026-08-02',
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
];

// Relative demand across the week, aligned index-for-index with
// EARNINGS_DATES above: a weekend peak, a slow Monday/Tuesday, and a lighter
// "today" figure since Wednesday isn't over yet. Fixed, not random.
const DAY_MULTIPLIERS = [0.85, 1.05, 1.35, 1.15, 0.68, 0.75, 0.58];

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-CA', { weekday: 'short' });

/** Deterministic — same catalog in, same earnings out, so tests stay stable. */
export function generateSampleEarnings(products: Product[]): EarningsSummary {
  const priced = products.filter((p) => p.priceCents > 0);
  const baseCents =
    priced.length === 0
      ? 0
      : Math.round(
          (priced.reduce((sum, p) => sum + effectivePriceCents(p), 0) / priced.length) * 14,
        );

  const daily: DailyEarning[] = EARNINGS_DATES.map((date, i) => ({
    date,
    label: WEEKDAY_FORMAT.format(new Date(`${date}T12:00:00`)),
    amountCents: Math.round(baseCents * DAY_MULTIPLIERS[i]),
  }));

  const last7DaysCents = daily.reduce((sum, d) => sum + d.amountCents, 0);

  return {
    todayCents: daily[daily.length - 1].amountCents,
    last7DaysCents,
    last30DaysCents: Math.round(last7DaysCents * (30 / 7)),
    daily,
  };
}
