import { describe, expect, it } from 'vitest';
import {
  effectivePriceCents,
  formatPotencyRange,
  formatPrice,
  formatStrainType,
} from '@/lib/format';
import type { Product } from '@/lib/catalog/types';

describe('formatPrice', () => {
  it('formats whole dollars with two decimals', () => {
    expect(formatPrice(2400)).toBe('$24.00');
  });

  it('formats cents correctly', () => {
    expect(formatPrice(999)).toBe('$9.99');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('groups thousands', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });
});

describe('formatPotencyRange', () => {
  it('returns an empty string for null', () => {
    expect(formatPotencyRange(null)).toBe('');
  });

  it('renders a range with an en dash', () => {
    expect(formatPotencyRange({ min: 230, max: 300, unit: 'mg/g' })).toBe('230–300 mg/g');
  });

  it('collapses an equal min and max to a single value', () => {
    expect(formatPotencyRange({ min: 300, max: 300, unit: 'mg/g' })).toBe('300 mg/g');
  });

  it('renders percent units without a space', () => {
    expect(formatPotencyRange({ min: 18, max: 24, unit: '%' })).toBe('18–24%');
  });

  it('collapses an equal percent range', () => {
    expect(formatPotencyRange({ min: 22, max: 22, unit: '%' })).toBe('22%');
  });

  it('drops trailing zeros on decimals', () => {
    expect(formatPotencyRange({ min: 18.5, max: 24.0, unit: '%' })).toBe('18.5–24%');
  });
});

describe('formatStrainType', () => {
  it('titles each known strain type', () => {
    expect(formatStrainType('indica-dominant')).toBe('Indica Dominant');
    expect(formatStrainType('sativa-dominant')).toBe('Sativa Dominant');
    expect(formatStrainType('hybrid')).toBe('Hybrid');
    expect(formatStrainType('cbd')).toBe('CBD');
  });

  it('returns an empty string for null', () => {
    expect(formatStrainType(null)).toBe('');
  });
});

describe('effectivePriceCents', () => {
  const base = { priceCents: 2400 } as Product;

  it('uses the regular price when there is no sale', () => {
    expect(effectivePriceCents({ ...base, salePriceCents: null })).toBe(2400);
  });

  it('uses the sale price when one is set', () => {
    expect(effectivePriceCents({ ...base, salePriceCents: 1800 })).toBe(1800);
  });
});
