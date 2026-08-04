import type { PotencyRange, Product, StrainType } from './catalog/types';

const priceFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
});

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function formatPotencyRange(range: PotencyRange | null): string {
  if (!range) return '';
  const suffix = range.unit === '%' ? '%' : ' mg/g';
  if (range.min === range.max) return `${trimNumber(range.min)}${suffix}`;
  return `${trimNumber(range.min)}–${trimNumber(range.max)}${suffix}`;
}

const STRAIN_LABELS: Record<StrainType, string> = {
  'indica-dominant': 'Indica Dominant',
  'sativa-dominant': 'Sativa Dominant',
  hybrid: 'Hybrid',
  cbd: 'CBD',
};

export function formatStrainType(type: StrainType | null): string {
  return type ? STRAIN_LABELS[type] : '';
}

export function effectivePriceCents(product: Pick<Product, 'priceCents' | 'salePriceCents'>): number {
  return product.salePriceCents ?? product.priceCents;
}
