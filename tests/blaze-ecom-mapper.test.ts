import { describe, expect, it } from 'vitest';
import {
  mapBlazeCategories,
  mapBlazeProduct,
  mapBlazeProductResponse,
  mapBlazeProductsResponse,
  mapBlazeStore,
  type BlazeCategoriesResponse,
  type BlazeProductResponse,
  type BlazeProductsResponse,
  type BlazeStoreResponse,
} from '@/lib/catalog/blaze-ecom-mapper';

import productsFixture from './fixtures/blaze-products.json';
import categoriesFixture from './fixtures/blaze-categories.json';
import storeFixture from './fixtures/blaze-store.json';
import productDetailFixture from './fixtures/blaze-product-detail.json';

// These fixtures are trimmed, real captures from https://ecom-api.staging.blaze.me
// against store e87437f2-3e35-4738-af5e-6307e368255c on 2026-08-05 (see
// .superpowers/sdd/fixtures/ for the untrimmed originals). Nothing in them is
// hand-invented except the one product literally labeled "synthetic" below, which
// exists solely to exercise a branch (is_promoted=true) that never occurred in the
// live sample.

const products = mapBlazeProductsResponse(productsFixture as unknown as BlazeProductsResponse);
const productBySlug = new Map(products.map((p) => [p.slug, p]));

function getProduct(slug: string) {
  const product = productBySlug.get(slug);
  if (!product) throw new Error(`fixture missing product with slug ${slug}`);
  return product;
}

describe('mapBlazeProductsResponse', () => {
  it('maps every fixture product without throwing', () => {
    expect(products).toHaveLength(8);
  });

  it('converts unit_price.amount directly to priceCents (already integer cents, not dollars)', () => {
    // Confirmed via the gift card's weight_prices: display_name "$10" carries
    // price.amount 1000. If this were dollars-to-cents, $10 would come out as
    // 100000 cents ($1000).
    const giftCard = getProduct('birchmount-gift-card-128935');
    expect(giftCard.priceCents).toBe(1000);

    const honeyShot = getProduct('honeyshot-buzz-490');
    expect(honeyShot.priceCents).toBe(1000);
  });

  it('derives salePriceCents from discount_price only when on_sale is true and a discount exists', () => {
    const honeyShot = getProduct('honeyshot-buzz-490');
    expect(honeyShot.priceCents).toBe(1000);
    expect(honeyShot.salePriceCents).toBe(800);
    expect(honeyShot.badges).toContain('on-sale');
  });

  it('leaves salePriceCents null when on_sale is true but no discount_price is present', () => {
    // Grandaddy Purple: on_sale=true, discount_price=null in the live payload.
    const gdp = getProduct('grandaddy-purple-489');
    expect(gdp.priceCents).toBe(6000);
    expect(gdp.salePriceCents).toBeNull();
    expect(gdp.badges).not.toContain('on-sale');
  });

  it('ignores a stale discount_price when on_sale is false', () => {
    // Day Tincture: on_sale=false but discount_price=5280 lingers in the payload.
    // The flag is authoritative, so this should not read as a sale.
    const dayTincture = getProduct('day-tincture-486');
    expect(dayTincture.priceCents).toBe(6600);
    expect(dayTincture.salePriceCents).toBeNull();
    expect(dayTincture.badges).not.toContain('on-sale');
  });

  it('maps composition percentages to a degenerate PotencyRange with unit %', () => {
    const whiteRhino = getProduct('white-rhino-509');
    expect(whiteRhino.thc).toEqual({ min: 89, max: 89, unit: '%' });
    expect(whiteRhino.cbd).toEqual({ min: 3, max: 3, unit: '%' });

    const briteLabs = getProduct('brite-labs-11-cherry-remedy-cartridge-6g-148773');
    expect(briteLabs.thc).toEqual({ min: 26.03000069, max: 26.03000069, unit: '%' });
    expect(briteLabs.cbd).toEqual({ min: 26, max: 26, unit: '%' });
  });

  it('leaves thc/cbd null when the only data is a total-mg dose, not a % composition', () => {
    // Focus Formula Tincture reports thc/cbd/potency all in "mg" (a per-dose total),
    // and composition is null. Relabeling a total-mg dose as our 'mg/g' concentration
    // unit would misrepresent it, so this must stay null rather than guess.
    const tincture = getProduct('focus-formula-tincture-487');
    expect(tincture.thc).toBeNull();
    expect(tincture.cbd).toBeNull();
  });

  it('translates flower_type into our StrainType enum', () => {
    expect(getProduct('grandaddy-purple-489').strainType).toBe('indica-dominant');
    expect(getProduct('sour-diesel-505').strainType).toBe('sativa-dominant');
    expect(getProduct('brite-labs-11-cherry-remedy-cartridge-6g-148773').strainType).toBe('cbd');
    // flower_type is null on non-flower items (e.g. a tincture) -> null, not guessed.
    expect(getProduct('focus-formula-tincture-487').strainType).toBeNull();
  });

  it('resolves category slug and brand name via the included relationships', () => {
    const honeyShot = getProduct('honeyshot-buzz-490');
    expect(honeyShot.category).toBe('edibles');
    expect(honeyShot.brand).toBe('Kikoko');

    const whiteRhino = getProduct('white-rhino-509');
    expect(whiteRhino.category).toBe('vape-pens');
    expect(whiteRhino.brand).toBe('Heavy Hitters');
  });

  it('falls back to an empty brand string when the product has no brand relationship at all', () => {
    // The gift card fixture has no "brand" key under relationships whatsoever.
    const giftCard = getProduct('birchmount-gift-card-128935');
    expect(giftCard.brand).toBe('');
  });

  it('resolves every image in relationships.images via included, in order', () => {
    const tincture = getProduct('focus-formula-tincture-487');
    expect(tincture.images).toEqual([
      'https://tymber-blaze-d2-products.imgix.net/357cdcdf-91cb-430c-b5c1-3f38bc5bdfaa-bee297aa-1f6a-473f-b7a8-6cd8163d9372.jpg',
      'https://tymber-blaze-d2-products.imgix.net/drrawtinc-945e7533-a8f9-45d0-9804-dc9e392b9121-07ac8c18-c7ab-4557-91ae-0fff373599ac.jpg',
      'https://tymber-blaze-d2-products.imgix.net/cannabis_what_is_it-ec06f1ad-635f-4a7e-921c-531707aa4e52-1ec9e189-c5da-4b1c-a05c-b880e88b55d2.jpg',
    ]);
  });

  it('uses the first price tier display_name as size when attributes.size is null', () => {
    // attributes.size is null on every live record we captured.
    expect(getProduct('honeyshot-buzz-490').size).toBe('.5g');
    expect(getProduct('day-tincture-486').size).toBe('1 each');
    // Gift card has no unit_prices, only weight_prices.
    expect(getProduct('birchmount-gift-card-128935').size).toBe('$10');
  });

  it('combines primary and secondary blaze_enrichment effects, and leaves both empty when absent', () => {
    const briteLabs = getProduct('brite-labs-11-cherry-remedy-cartridge-6g-148773');
    expect(briteLabs.effects).toEqual([
      'Calm',
      'Relaxed',
      'Clear-headed',
      'Body comfort',
      'Stress relief',
      'Anxiety reduction',
      'Mild euphoria',
      'Focus',
    ]);
    expect(getProduct('honeyshot-buzz-490').effects).toEqual([]);
  });

  it('maps terpenoids straight across, defaulting missing/null to an empty array', () => {
    // Every live record had terpenoids: [] or null; never invented.
    expect(getProduct('honeyshot-buzz-490').terpenes).toEqual([]);
    expect(getProduct('white-rhino-509').terpenes).toEqual([]); // fixture has terpenoids: null
  });

  it('never invents a "new-drop" badge, since BLAZE ECOM has no creation timestamp', () => {
    for (const product of products) {
      expect(product.badges).not.toContain('new-drop');
    }
  });

  it('never returns a negative price and never returns min > max on a potency range', () => {
    for (const product of products) {
      expect(product.priceCents).toBeGreaterThanOrEqual(0);
      if (product.thc) expect(product.thc.min).toBeLessThanOrEqual(product.thc.max);
      if (product.cbd) expect(product.cbd.min).toBeLessThanOrEqual(product.cbd.max);
      if (product.salePriceCents !== null) {
        expect(product.salePriceCents).toBeLessThan(product.priceCents);
      }
    }
  });
});

describe('mapBlazeProductResponse (v2 detail)', () => {
  it('maps a single product/included detail payload the same way as the list mapper', () => {
    const product = mapBlazeProductResponse(productDetailFixture as unknown as BlazeProductResponse);
    expect(product.slug).toBe('honeyshot-buzz-490');
    expect(product.priceCents).toBe(1000);
    expect(product.salePriceCents).toBe(800);
    expect(product.brand).toBe('Kikoko');
    expect(product.category).toBe('edibles');
  });
});

describe('mapBlazeProduct — synthetic edge cases', () => {
  // The live 100-product sample never had is_promoted: true, so this exercises that
  // branch with a minimal hand-built (not captured) resource. Everything else here
  // mirrors real attribute shapes seen elsewhere in the fixtures.
  const baseAttributes = {
    name: 'Synthetic Promoted Product',
    slug: 'synthetic-promoted-product',
    description: null,
    main_image: null,
    in_stock: true,
    on_sale: false,
    is_promoted: true,
    flower_type: null,
    size: null,
    composition: null,
    external_id: 'synthetic-1',
    unit_price: { amount: 2500, currency: 'usd' },
    discount_price: null,
    unit_prices: null,
    weight_prices: null,
    terpenoids: null,
    blaze_enrichment: null,
    updated_at: null,
  };

  it('maps is_promoted to a staff-pick badge', () => {
    const product = mapBlazeProduct(
      {
        id: 999999,
        type: 'products',
        attributes: baseAttributes,
        relationships: {},
      },
      [],
    );
    expect(product.badges).toContain('staff-pick');
    expect(product.images).toEqual([]);
    expect(product.brand).toBe('');
    expect(product.category).toBe('');
    expect(product.size).toBe('');
  });

  it('clamps a negative unit_price to zero rather than propagating it', () => {
    const product = mapBlazeProduct(
      {
        id: 999998,
        type: 'products',
        attributes: { ...baseAttributes, unit_price: { amount: -500, currency: 'usd' } },
        relationships: {},
      },
      [],
    );
    expect(product.priceCents).toBe(0);
  });
});

describe('mapBlazeCategories', () => {
  const categories = mapBlazeCategories(categoriesFixture as unknown as BlazeCategoriesResponse);

  it('deduplicates a real duplicate slug in the live category list ("edibles" appears twice)', () => {
    const slugs = categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const edibles = categories.find((c) => c.slug === 'edibles');
    expect(edibles).toBeDefined();
    // Keeps the more-populated record (id 6981, count 13, name "Edibles") over the
    // near-empty duplicate (id 90, count 1, name "EDIBLES").
    expect(edibles?.name).toBe('Edibles');
  });

  it('maps every category with a non-empty slug and falls back to "" for a null description', () => {
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(category.slug.length).toBeGreaterThan(0);
      expect(typeof category.blurb).toBe('string');
    }
  });
});

describe('mapBlazeStore', () => {
  it('maps the store address fields and leaves phone/hours as their honest empty defaults', () => {
    const store = mapBlazeStore(storeFixture as unknown as BlazeStoreResponse);
    expect(store).toEqual({
      id: 'e87437f2-3e35-4738-af5e-6307e368255c',
      name: 'Staging - Blaze 1 & Test Staging',
      address: 'Golden Gate Park: 501 Stanyan St',
      city: 'Aurora',
      province: 'NY',
      postalCode: '60506',
      // BLAZE ECOM's /api/v1/store response has no phone or hours field at all.
      phone: '',
      hours: [],
    });
  });
});
