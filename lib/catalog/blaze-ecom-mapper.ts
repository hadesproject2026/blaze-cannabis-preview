/**
 * Maps BLAZE ECOM's JSON:API payloads onto this app's `Product` / `Category` / `Store`
 * shapes (see ./types.ts).
 *
 * These interfaces cover only the fields this mapper reads. They were derived by
 * inspecting real responses from https://ecom-api.staging.blaze.me on 2026-08-05 for
 * store e87437f2-3e35-4738-af5e-6307e368255c — not from documentation. See
 * `.superpowers/sdd/live-phase1-report.md` for the full field-by-field notes, including
 * several places where the live shape differs from what the design doc assumed.
 */

import type { Category, PotencyRange, Product, ProductBadge, StrainType, Store } from './types';

// ---------------------------------------------------------------------------
// Raw BLAZE ECOM shapes
// ---------------------------------------------------------------------------

interface BlazeMoney {
  amount: number;
  currency: string;
}

interface BlazePriceTier {
  display_name: string | null;
  price: BlazeMoney | null;
  discount_price: BlazeMoney | null;
}

interface BlazeComposition {
  thc: number | null;
  cbd: number | null;
  [key: string]: unknown;
}

interface BlazeEnrichmentEffects {
  primary?: string[] | null;
  secondary?: string[] | null;
}

interface BlazeEnrichment {
  effects?: BlazeEnrichmentEffects | null;
}

interface BlazeProductAttributes {
  name: string;
  slug: string;
  description: string | null;
  main_image: string | null;
  in_stock: boolean;
  on_sale: boolean;
  is_promoted: boolean;
  flower_type: string | null;
  size: string | null;
  composition: BlazeComposition | null;
  external_id: string | null;
  unit_price: BlazeMoney | null;
  discount_price: BlazeMoney | null;
  unit_prices: BlazePriceTier[] | null;
  weight_prices: BlazePriceTier[] | null;
  terpenoids: string[] | null;
  blaze_enrichment: BlazeEnrichment | null;
  updated_at: string | null;
}

interface BlazeResourceRef {
  id: number;
  type: string;
}

interface BlazeRelationship {
  data: BlazeResourceRef | BlazeResourceRef[] | null;
}

interface BlazeProductResource {
  id: number;
  type: string;
  attributes: BlazeProductAttributes;
  relationships: {
    category?: BlazeRelationship;
    brand?: BlazeRelationship;
    images?: BlazeRelationship;
  };
}

export interface BlazeIncludedResource {
  id: number;
  type: string;
  attributes: Record<string, unknown>;
}

export interface BlazeProductsResponse {
  data: BlazeProductResource[];
  included?: BlazeIncludedResource[];
  meta?: { offset: number; limit: number; total_count: number };
}

export interface BlazeProductResponse {
  data: BlazeProductResource;
  included?: BlazeIncludedResource[];
}

interface BlazeCategoryAttributes {
  name: string | null;
  slug: string | null;
  description: string | null;
  count: number | null;
}

interface BlazeCategoryResource {
  id: number;
  type: string;
  attributes: BlazeCategoryAttributes;
}

export interface BlazeCategoriesResponse {
  data: BlazeCategoryResource[];
}

interface BlazeStoreAddress {
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
}

interface BlazeStoreAttributes {
  uuid: string;
  name: string;
  address: BlazeStoreAddress | null;
}

interface BlazeStoreResource {
  id: string;
  type: string;
  attributes: BlazeStoreAttributes;
}

export interface BlazeStoreResponse {
  data: BlazeStoreResource;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * BLAZE ECOM's `unit_price.amount` / `discount_price.amount` are already integer
 * cents, not dollars, despite what the design spec assumed. Confirmed against live
 * data: a "Birchmount gift card" carries `weight_prices` tiers literally labelled
 * "$10" / "$25" / "$50" / "$100" whose `price.amount` are 1000 / 2500 / 5000 / 10000 —
 * a 100x dollars-to-cents multiplication would have inflated every price 100x.
 * So this only rounds and floors at zero; it does not multiply.
 */
function centsFromMoney(money: BlazeMoney | null | undefined): number | null {
  if (!money || typeof money.amount !== 'number' || Number.isNaN(money.amount)) return null;
  return Math.max(0, Math.round(money.amount));
}

const FLOWER_TYPE_TO_STRAIN: Record<string, StrainType> = {
  indica: 'indica-dominant',
  sativa: 'sativa-dominant',
  hybrid: 'hybrid',
  cbd: 'cbd',
};

function mapStrainType(flowerType: string | null | undefined): StrainType | null {
  if (!flowerType) return null;
  return FLOWER_TYPE_TO_STRAIN[flowerType.trim().toLowerCase()] ?? null;
}

/**
 * `attributes.composition.{thc,cbd}` are the only genuinely percentage-shaped potency
 * fields BLAZE ECOM returns (verified 0-100 range across a live 100-product sample).
 * They are single point values, not ranges, so they map to a degenerate
 * `{min: v, max: v}` — that represents "exactly this value," not an invented range.
 *
 * Deliberately NOT used: `attributes.thc` / `attributes.cbd` / `attributes.potency`,
 * which report a total milligram dose (unit "mg", e.g. "10mg THC per dose" on an
 * edible) rather than a concentration. Our schema's PotencyUnit is '%' | 'mg/g'; a
 * total-mg dose is neither, and relabeling it as 'mg/g' would misrepresent it (it is
 * not "per gram" — the product has no reliable weight to divide by). Also ignored:
 * `potency.min_thc`/`max_thc`/`min_cbd`/`max_cbd`, which are 0 on every real record
 * we saw (including ones with a nonzero point value), i.e. an unpopulated placeholder,
 * not a real range boundary.
 */
function percentRange(value: number | null | undefined): PotencyRange | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return { min: value, max: value, unit: '%' };
}

function mapPotency(composition: BlazeComposition | null | undefined): {
  thc: PotencyRange | null;
  cbd: PotencyRange | null;
} {
  if (!composition) return { thc: null, cbd: null };
  return {
    thc: percentRange(typeof composition.thc === 'number' ? composition.thc : null),
    cbd: percentRange(typeof composition.cbd === 'number' ? composition.cbd : null),
  };
}

function mapBadges(attrs: BlazeProductAttributes, salePriceCents: number | null): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (attrs.is_promoted) badges.push('staff-pick');
  if (attrs.on_sale && salePriceCents !== null) badges.push('on-sale');
  return badges;
  // No 'new-drop' mapping: BLAZE ECOM exposes no creation timestamp (only
  // `updated_at`), so there is no genuine "recently added" signal to key off.
}

function mapEffects(enrichment: BlazeEnrichment | null | undefined): string[] {
  const effects = enrichment?.effects;
  if (!effects) return [];
  const primary = Array.isArray(effects.primary) ? effects.primary : [];
  const secondary = Array.isArray(effects.secondary) ? effects.secondary : [];
  return [...primary, ...secondary];
}

/**
 * `attributes.size` is null on every live record seen. The closest genuine
 * substitute is the first price tier's `display_name` (e.g. ".5g", "1g", "1 each",
 * "$10"), which is real, retailer-authored packaging text, not an invented value.
 */
function mapSize(attrs: BlazeProductAttributes): string {
  if (attrs.size) return attrs.size;
  const tier = attrs.unit_prices?.[0] ?? attrs.weight_prices?.[0];
  return tier?.display_name ?? '';
}

function firstRefId(rel: BlazeRelationship | undefined): number | undefined {
  const data = rel?.data;
  if (!data) return undefined;
  return Array.isArray(data) ? data[0]?.id : data.id;
}

function resolveIncluded(
  included: BlazeIncludedResource[] | undefined,
  type: string,
  id: number | undefined,
): BlazeIncludedResource | undefined {
  if (id === undefined) return undefined;
  return included?.find((resource) => resource.type === type && resource.id === id);
}

function mapImages(resource: BlazeProductResource, included: BlazeIncludedResource[] | undefined): string[] {
  const rel = resource.relationships.images?.data;
  const refs = Array.isArray(rel) ? rel : rel ? [rel] : [];
  const urls = refs
    .map((ref) => resolveIncluded(included, 'product_images', ref.id))
    .map((image) => (image?.attributes as { url?: string } | undefined)?.url)
    .filter((url): url is string => Boolean(url));
  if (urls.length > 0) return urls;
  return resource.attributes.main_image ? [resource.attributes.main_image] : [];
}

// ---------------------------------------------------------------------------
// Public mappers
// ---------------------------------------------------------------------------

export function mapBlazeProduct(
  resource: BlazeProductResource,
  included: BlazeIncludedResource[] | undefined,
): Product {
  const attrs = resource.attributes;
  const priceCents = centsFromMoney(attrs.unit_price) ?? 0;

  // `on_sale` is the authoritative flag; `discount_price` is only trusted alongside
  // it. Live data has both a case where on_sale=true but discount_price is absent
  // (no derivable sale price — left null per spec) and the mirror case where
  // on_sale=false but a stale discount_price lingers (ignored, since the flag says
  // this item is not currently on sale).
  const discountCents = attrs.on_sale ? centsFromMoney(attrs.discount_price) : null;
  const salePriceCents = discountCents !== null && discountCents < priceCents ? discountCents : null;

  const { thc, cbd } = mapPotency(attrs.composition);

  const categoryId = firstRefId(resource.relationships.category);
  const categoryResource = resolveIncluded(included, 'product_categories', categoryId);
  const categorySlug = (categoryResource?.attributes as { slug?: string } | undefined)?.slug ?? '';

  const brandId = firstRefId(resource.relationships.brand);
  const brandResource = resolveIncluded(included, 'product_brands', brandId);
  const brandName = (brandResource?.attributes as { name?: string } | undefined)?.name ?? '';

  return {
    id: attrs.external_id || String(resource.id),
    slug: attrs.slug || String(resource.id),
    name: attrs.name,
    brand: brandName,
    category: categorySlug,
    strainType: mapStrainType(attrs.flower_type),
    thc,
    cbd,
    size: mapSize(attrs),
    priceCents,
    salePriceCents,
    inStock: Boolean(attrs.in_stock),
    images: mapImages(resource, included),
    description: attrs.description ?? '',
    terpenes: Array.isArray(attrs.terpenoids) ? attrs.terpenoids : [],
    effects: mapEffects(attrs.blaze_enrichment),
    badges: mapBadges(attrs, salePriceCents),
    addedAt: attrs.updated_at ?? '',
  };
}

export function mapBlazeProductsResponse(payload: BlazeProductsResponse): Product[] {
  return payload.data.map((resource) => mapBlazeProduct(resource, payload.included));
}

export function mapBlazeProductResponse(payload: BlazeProductResponse): Product {
  return mapBlazeProduct(payload.data, payload.included);
}

/**
 * Live staging data has a real duplicate: two category records both carry the slug
 * "edibles" (id 90 "EDIBLES", count 1; id 6981 "Edibles", count 13). Our `Category`
 * type is keyed by slug, so returning both would break slug uniqueness. This keeps
 * whichever record has more products attached (a genuine signal of which one is
 * actually in use), not an invented value.
 */
export function mapBlazeCategories(payload: BlazeCategoriesResponse): Category[] {
  const bySlug = new Map<string, { count: number; category: Category }>();
  for (const resource of payload.data) {
    const slug = resource.attributes.slug;
    if (!slug) continue;
    const count = resource.attributes.count ?? 0;
    const category: Category = {
      slug,
      name: resource.attributes.name ?? slug,
      blurb: resource.attributes.description ?? '',
    };
    const existing = bySlug.get(slug);
    if (!existing || count > existing.count) {
      bySlug.set(slug, { count, category });
    }
  }
  return [...bySlug.values()].map((entry) => entry.category);
}

/**
 * `GET /api/v1/store` returns no `phone` and no `hours` field at all (verified
 * against the live payload for the demo store). Both are left as their type's
 * honest "nothing here" value ('' and []) rather than invented.
 */
export function mapBlazeStore(payload: BlazeStoreResponse): Store {
  const attrs = payload.data.attributes;
  const address = attrs.address;
  return {
    id: attrs.uuid,
    name: attrs.name,
    address: address?.address ?? '',
    city: address?.city ?? '',
    province: address?.state ?? '',
    postalCode: address?.zip_code ?? '',
    phone: '',
    hours: [],
  };
}
