# Blaze Cannabis — Storefront Redesign (Pitch Build)

**Date:** 2026-08-04
**Status:** Draft for review
**Type:** Single-cycle front-end build (Greenline POS wiring is a deferred follow-up spec)
**Reference site:** https://shopblaze.ca/menu/brampton/

## Context

Blaze Cannabis is a licensed Ontario cannabis retailer with a Brampton location. Their
current web presence is a thin marketing page (`shopblaze.ca`) that links to a
**Greenline-powered menu embed** at `/menu/brampton/`. The menu is functional but visually
generic — a light theme with stock chrome, indistinguishable from every other Greenline
storefront.

The client wants a recreation with a **darker, more enticing theme** and an **animated
landing page**.

## Goal

Ship a front-end that wins the redesign. It must look and move like a finished product,
run entirely on local data so it cannot fail during a demo, and be architected so the live
Greenline POS integration drops in afterward without a rewrite.

## Non-goals (out of scope this cycle)

- Real accounts, authentication, or the Alpine IQ VIP membership flow.
- Payments or checkout. The cart proves the interaction, not the transaction.
- An admin panel or inventory management.
- Live Greenline API calls. Deferred to its own spec (see *Deferred work*).
- About / Locations / Blog / Contact pages. They need client-supplied content.

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Deliverable | Pitch build, POS-ready | Starts today with no client credentials; a demo on a live third-party API can fail in the room |
| Theme | **Nocturne** — cool near-black, emerald action colour, champagne hairlines | Reads boutique apothecary; least like other cannabis sites |
| Landing motion | **Living catalogue** — parallax product layers, rising motes, light shaft, cursor reaction | Closest to the client's "animated images" ask |
| Stack | Next.js 14 App Router + TypeScript | Matches the `klyq` house pattern; server runtime is required to hold the Greenline token later |
| Animation | CSS + a small pointer-parallax hook | No animation library — ~50kb is unjustifiable on a page whose pitch is "feels expensive" |
| Data | Local `catalog.json`, seeded once from the live menu | Real brands and prices, deterministic behaviour |
| Deploy | Netlify | Consistent with Paper Roses and klyq |

## Theme — Nocturne

```
--bg            #08090C   canvas
--surface       #111319   cards, panels
--surface-2     #171A22   raised / hover
--border        #20242F
--border-strong #2A3040
--text          #ECEEF2
--text-muted    #7A8094
--accent        #34D399   actions, CTA, in-stock
--accent-press  #22B87F
--gold          #C8B78A   hairlines, prices, kickers
--gold-dim      rgba(200,183,138,.35)
--danger        #F87171   sold out
--spot-yellow   #FFE000   Blaze yellow, retained ONLY for new-drop / sale badges
```

**Typography:** a self-hosted variable serif for display headlines, Inter (self-hosted
variable) for UI and body, system stack as fallback. No external font CDN — the strict
offline-safe requirement applies to the demo too.

**Logo treatment:** the Blaze wordmark renders in warm off-white (`#E7E2D4`) on this
palette. Their existing yellow is kept alive as a spot colour on badges only. Physical
signage is unaffected. **This is the one open item requiring client sign-off** — decolouring
an owner's logo is a sensitive thing to present without warning.

## Motion system

```
--dur-fast  150ms    hover, chip toggle
--dur       280ms    drawer, panel, card entrance
--dur-slow  600ms    scroll reveals
ambient loops        6–16s, transform/opacity only
--ease-out  cubic-bezier(.16, 1, .3, 1)
```

**Rules, not suggestions:**

1. Ambient loops animate `transform` and `opacity` only. Nothing that triggers layout.
2. `prefers-reduced-motion: reduce` disables every ambient loop and scroll reveal, leaving
   the static composition. This is an accessibility requirement, not a toggle.
3. Hero motion pauses via `IntersectionObserver` when scrolled out of view, and on
   `visibilitychange` when the tab is hidden. A background tab must not burn battery.
4. One moment of spectacle. The hero moves; everything below it is restrained scroll-reveal.

## Surfaces

### 1. Landing (`/`)

Full-height hero on the Nocturne canvas: a shaft of light, three product cut-outs drifting
on separate parallax layers, motes rising through the beam, headline, and a "Browse the
menu" CTA. Products react to cursor position on pointer devices.

Below the fold, restraint: a category quick-grid (Flower, Pre-rolls, Vape, Edibles,
Concentrates, Accessories) with scroll-reveal, a "Budtender Selects" rail of six products
from the catalog, a store block (Brampton address, hours, pickup info), and the footer.

### 2. Menu (`/menu/brampton`)

The workhorse. Sticky header (logo, search, cart count), pickup-location selector, category
chip row, sort dropdown (Price, THC, Name, Newest), and a filter panel (category, strain
type, THC range, brand, price). Product grid below.

Filtering, sorting, and search run **client-side** against the in-memory catalog — instant,
no spinners. This is a large part of why the redesign will feel faster than the original.

### 3. Product detail (`/product/[slug]`)

Large image, brand, name, strain badge, THC/CBD ranges, size, price, quantity stepper, add
to cart. Description, terpene and effect chips, and a "More from this brand" rail.

### 4. Cart drawer

Global overlay on any page. Line items with quantity steppers, subtotal, and a "Reserve for
pickup" button leading to a confirmation state. No payment.

### 5. Age gate

Blocks first visit. 19+ confirmation (Ontario), remembered in localStorage. Styled as part
of the design rather than a bolted-on interstitial — it is the first thing anyone sees.

## Data layer and the POS seam

```
lib/catalog/
  types.ts         Product, Brand, Category, Store, StrainType
  source.ts        CatalogSource — the only module the UI imports
  mock-source.ts   reads data/catalog.json
  index.ts         getCatalogSource() — selects implementation from env
data/catalog.json  ~50 products, committed
scripts/seed-catalog.ts
```

```ts
interface CatalogSource {
  listProducts(): Promise<Product[]>
  getProduct(slug: string): Promise<Product | null>
  listCategories(): Promise<Category[]>
  getStore(id: string): Promise<Store>
}
```

Every method is **async even though the mock is synchronous**. If the mock were sync, every
call site would need rewriting when the network-backed Greenline adapter arrives, and the
"one-file swap" guarantee would be false.

**Product shape:** `id`, `slug`, `name`, `brand`, `category`, `strainType`
(`indica-dominant | sativa-dominant | hybrid | cbd | null`), `thc` and `cbd` as
`{min, max, unit}` (their menu uses both `%` and `MG/G`), `size`, `priceCents`,
`salePriceCents`, `inStock`, `images[]`, `description`, `terpenes[]`, `effects[]`, and
`badges[]` (`new-drop | staff-pick | on-sale`).

**Seeding:** `scripts/seed-catalog.ts` reads the public Brampton menu once during
development and writes `data/catalog.json`, which is committed. It does **not** run at build
time — the demo must never depend on a network call to a site we don't control.

The ~50 products span all 12 categories (Dried Flower, Pre-rolls, Vape, Infused Pre-Rolls,
Concentrates, Edibles, Accessories, Capsules, Beverages, Oil, Topicals, Seeds) and
deliberately include the awkward cases: sold out, on sale, a name long enough to wrap two
lines, and one with a missing image.

If the live menu proves un-scrapable — it is a JavaScript-rendered Greenline embed and may
resist automated reading — the fallback is hand-transcribing roughly 50 real products from
the rendered page into `catalog.json`. Slower, same result. The seed script is a convenience,
not a dependency, and implementation must not stall on it.

**Server/client boundary:** the catalog loads in a server component and is passed down.
When Greenline lands, that server component calls the live adapter using a token from env,
and every client component stays exactly as written.

**Cart** is independent — React context over localStorage, keyed by product id. It never
touches the catalog source.

## Responsive contract

Verified at **390px** (mobile) and **1440px** (desktop) before any completion claim, with
screenshots at both widths.

| Element | Desktop | Mobile |
|---|---|---|
| Hero | 3 drifting products, full mote count, cursor parallax | 2 products, half the motes, scroll-linked drift (touch has no cursor) |
| Product grid | 4 columns | 2 columns (3 on tablet) — never 1; a 50-product single column feels endless |
| Category chips | Full row | Horizontal scroll, as the original does |
| Filters | Sidebar | Full-screen sheet |
| Cart | Right drawer | Bottom sheet |
| Age gate | Centred modal | Centred modal |

**Performance budget:** LCP under 2.5s on mid-tier mobile over 4G. Parallax hook under 8kb.
`next/image` with AVIF/WebP and explicit dimensions everywhere. The floating-parallax hero is
the single most likely thing to stutter on a mid-range Android, so it is built mobile-first
rather than adapted afterward.

## Compliance and accessibility

Ontario (AGCO) rules govern a licensed retailer's public site. The design stays inside them:

- Age gate on entry, 19+.
- No health, medical, or lifestyle claims in any copy.
- Nothing in the visual language that appeals to minors — no cartoons, no candy motifs.
- The appeal comes from craft (motion, typography, materials), not from claims.

Accessibility: WCAG AA contrast on all text (the Nocturne palette is chosen to clear it),
full keyboard navigation for chips, filters, drawer, and gate, visible focus rings, and
`prefers-reduced-motion` honoured throughout.

## Error handling

| Case | Behaviour |
|---|---|
| Missing product image | Styled fallback tile with brand initial — never a broken image |
| Filter returns nothing | Themed empty state with a "clear filters" action |
| Unknown product slug | Themed 404, not the Next.js default |
| Catalog fails to load | Not reachable with the mock source; the live adapter will need a last-good-cache strategy, specified in that spec |

## Testing

Vitest, matching the `klyq` setup.

- **Contract suite for `CatalogSource`** — a shared test suite any implementation must pass.
  The mock passes it now; the Greenline adapter gets verified against the identical tests
  later. This is the highest-value test in the build.
- Filter, sort, and search predicates, including THC-range and price-range edges.
- Cart reducer: add, remove, quantity change, persistence round-trip.
- Formatting helpers: price, THC/CBD ranges across both `%` and `MG/G` units.
- Age-gate persistence.
- Browser verification at both widths, with screenshots.

## Deferred work (own spec, after client sign-off)

**Greenline live adapter.** Implement `CatalogSource` against the Greenline external API
using the retailer's authorization token, company name, company ID, and location ID —
generated by the client from the Integrations tab of their Greenline dashboard. Token lives
server-side only, never in the browser. Must pass the existing contract suite. Needs a
caching and last-good-value strategy so POS downtime degrades gracefully rather than
emptying the shelf.

## Open items

1. **Logo decolouring** — client sign-off needed before the pitch (see *Theme*).
2. **Product photography** — the hero parallax needs cut-out images. Seeded menu images may
   sit on white backgrounds and need masking, or the client supplies assets.
3. **Age gate is client-enforced only.** The gate blocks the background with `inert`, and a
   `<noscript>` fallback covers JavaScript-disabled visitors, so no user path reaches the
   store unverified. But the page content is still present in the server-rendered HTML before
   hydration — visible to `view-source` and to crawlers. Closing that requires moving
   verification to a cookie read server-side in middleware, rather than localStorage read in
   the browser. Acceptable for a pitch build that is never publicly linked; **a prerequisite
   before this is ever served as the client's live storefront.**
