import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import catalog from '@/data/catalog.json';

const potency = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  unit: z.enum(['%', 'mg/g']),
});

const product = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  strainType: z.enum(['indica-dominant', 'sativa-dominant', 'hybrid', 'cbd']).nullable(),
  thc: potency.nullable(),
  cbd: potency.nullable(),
  size: z.string().min(1),
  priceCents: z.number().int().positive(),
  salePriceCents: z.number().int().positive().nullable(),
  inStock: z.boolean(),
  images: z.array(z.string()),
  description: z.string().min(1),
  terpenes: z.array(z.string()),
  effects: z.array(z.string()),
  badges: z.array(z.enum(['new-drop', 'staff-pick', 'on-sale'])),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const file = z.object({
  store: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    phone: z.string(),
    hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string() })).min(1),
  }),
  categories: z.array(z.object({ slug: z.string(), name: z.string(), blurb: z.string() })),
  products: z.array(product),
});

const REQUIRED_CATEGORIES = [
  'dried-flower', 'pre-rolls', 'vape', 'infused-pre-rolls', 'concentrates',
  'edibles', 'accessories', 'capsules', 'beverages', 'oil', 'topicals', 'seeds',
];

describe('catalog.json', () => {
  const parsed = file.parse(catalog);

  it('holds at least 45 products', () => {
    expect(parsed.products.length).toBeGreaterThanOrEqual(45);
  });

  it('covers all twelve categories', () => {
    const slugs = parsed.categories.map((c) => c.slug).sort();
    expect(slugs).toEqual([...REQUIRED_CATEGORIES].sort());
  });

  it('has at least one product in every category', () => {
    const empty = REQUIRED_CATEGORIES.filter(
      (slug) => !parsed.products.some((p) => p.category === slug),
    );
    expect(empty).toEqual([]);
  });

  it('includes a sold-out product', () => {
    expect(parsed.products.some((p) => !p.inStock)).toBe(true);
  });

  it('includes an on-sale product with a lower sale price', () => {
    expect(
      parsed.products.some(
        (p) => p.salePriceCents !== null && p.salePriceCents < p.priceCents,
      ),
    ).toBe(true);
  });

  it('includes a name long enough to wrap two lines', () => {
    expect(parsed.products.some((p) => p.name.length >= 45)).toBe(true);
  });

  it('includes a product with no image, to exercise the fallback tile', () => {
    expect(parsed.products.some((p) => p.images.length === 0)).toBe(true);
  });

  it('references only local images', () => {
    const remote = parsed.products
      .flatMap((p) => p.images)
      .filter((src) => !src.startsWith('/products/'));
    expect(remote).toEqual([]);
  });

  // Without this, a catalog with zero images would satisfy the assertion above
  // trivially, and the grid would render as a wall of fallback tiles.
  it('has a local image for all but a handful of products', () => {
    const withImages = parsed.products.filter((p) => p.images.length > 0);
    expect(withImages.length).toBeGreaterThanOrEqual(parsed.products.length - 5);
  });

  it('uses both potency units somewhere in the catalog', () => {
    const units = new Set(
      parsed.products.flatMap((p) => [p.thc?.unit, p.cbd?.unit]).filter(Boolean),
    );
    expect(units.has('%')).toBe(true);
    expect(units.has('mg/g')).toBe(true);
  });

  // A later task renders the landing page's "Budtender Selects" rail from
  // exactly these six products.
  it('marks exactly six products as staff picks', () => {
    const picks = parsed.products.filter((p) => p.badges.includes('staff-pick'));
    expect(picks.length).toBe(6);
  });
});
