# Blaze Cannabis — Storefront Redesign

Pitch build recreating the Blaze Cannabis Brampton storefront with the Nocturne
dark theme and an animated landing hero. Includes a demo admin console and a
partially-proven live commerce integration behind an environment flag.

Specs:
- `docs/2026-08-04-storefront-design.md` — the storefront
- `docs/2026-08-05-blaze-ecom-live-integration.md` — live BLAZE ECOM integration
- `docs/2026-08-04-implementation-plan.md` — the task-by-task build plan

## Running

    npm install
    npm run dev      # http://localhost:3000
    npm test
    npx tsc --noEmit
    npm run build

Age gate: click through it once, or in a browser console:

    localStorage.setItem('blaze.age-verified.v1', 'true')

Admin console lives at `/admin` behind a demo sign-in: `owner@blaze.demo` or `owner`
(case-insensitive), passcode `blaze`. To skip re-entering it:

    localStorage.setItem('blaze.admin.v1', 'true')

## Data

All product data lives in `data/catalog.json` — 54 real products seeded once from the
live Brampton menu. Images are local, under `public/products/`.

`CATALOG_SOURCE` defaults to `mock` (unset behaves the same as `mock`). **The demo must
not depend on a network** — with the default, nothing fetches at runtime, so it cannot be
broken by someone else's uptime. `scripts/seed-catalog.ts` (`npm run seed`) is a one-time
development helper that populated the committed catalog; it is deliberately not part of
the build.

Setting `CATALOG_SOURCE=blaze` switches the storefront to read live from BLAZE ECOM
instead — see "Live BLAZE ECOM integration" below.

## Architecture

Every catalog read goes through `CatalogSource` (`lib/catalog/source.ts`), implemented by
`MockCatalogSource` (default) and `BlazeEcomCatalogSource` (live). `getCatalogSource()` in
`lib/catalog/index.ts` picks between them based on `CATALOG_SOURCE`. No component changes
are needed to switch — the storefront only ever talks to the interface.

The contract suite in `tests/catalog-source.contract.ts` is the acceptance bar for any
`CatalogSource` implementation; both existing sources pass it.

## Live BLAZE ECOM integration

The client's payment rail is Greenline POS + BLAZEPAY. Online ordering and payment run
through **BLAZE ECOM**, a separate headless commerce API that sits in front of Greenline —
not the Greenline API itself (an earlier assumption in the original spec, corrected in the
2026-08-05 design doc above).

Status, phase by phase:

1. **Catalog — proven.** `BlazeEcomCatalogSource` passes the full `runCatalogSourceContract`
   suite (12/12) against the client's staging store.
2. **Cart and validation — proven against real responses.** The local cart is replayed into
   a BLAZE cart at checkout: create cart, add each line, set pickup, validate. This has been
   exercised against staging, including a real out-of-stock rejection and real validated
   pricing.
3. **Order submission — not proven.** Every attempt (four, including one through the real
   browser UI) returned `submission_status: "failed"` with `"Unexpected error communicating
   with the store."` — a failure inside BLAZE's own bridge to the POS behind their demo
   store, not in this codebase. Until the client's account is confirmed provisioned for
   BLAZE ECOM (not just Greenline POS), order creation cannot be exercised anywhere.
4. **Payment — not built.** Phase 3 (the `pay` call and BLAZEPAY) was deliberately not
   started, since it needs both a working order and BLAZEPAY's provider identifier from the
   client, and neither exists yet.

Full detail, including the field-mapping corrections found while integrating (prices are
already in cents, not dollars; remote images only load under `CATALOG_SOURCE=blaze`) and
the catalog-scale finding (the client's real store holds far more products than this
demo's in-memory filtering model can serve as-is), is in the design doc linked above.

## Known limitations

Things worth knowing before this is shown to the client, or before it goes further than a
pitch.

- **One product's crossed-out "was" price is illustrative, not real, and this must be
  disclosed before any client presentation.** The client's menu flags items on sale without
  publishing what the original price was. Three invented "was" figures were removed during
  the build; one was deliberately kept so the sale-price styling has something to
  demonstrate. Every other price on the site is real.
- **Terpenes and effects are empty on all 54 products.** The client's system doesn't
  publish either field, so those sections never render on the product page — real data
  would make the page noticeably fuller than what's shown here.
- **The age gate is client-enforced, not server-enforced.** It uses the `inert` attribute
  to remove the rest of the page from the tab order and screen-reader access the moment it
  mounts, and there's a `<noscript>` fallback for JavaScript-disabled visitors — so no
  user-facing path reaches the store unverified. But the store's HTML is still present in
  the server-rendered response before hydration runs. A live public storefront should move
  verification to a cookie checked in middleware instead.
- **The admin area is a demo, not a back office.** Orders, customers, reviews, and every
  earnings figure are generated sample data, labelled as such on screen (look for the gold
  "Demo" tags). Products and store details are the real catalog and real store info. The
  sign-in screen (`owner@blaze.demo` / `owner`, passcode `blaze`) looks like a login so it
  reads as a business tool during a pitch, but it is a pitch-preview speed bump, not access
  control — it is not a substitute for real authentication before any real deployment.
- **Live BLAZE ECOM integration is partially proven** — see the phase-by-phase status
  above. Catalog and cart/validation work against real responses; order submission has
  never succeeded past BLAZE's own POS bridge on their demo store; payment isn't built.
  Nothing here blocks the pitch, since the demo runs on `CATALOG_SOURCE=mock` by default,
  but it does block going live.
- **Two open items need client sign-off** before final production polish: decolouring the
  yellow wordmark to off-white, and cut-out product photography for the hero (currently
  using the client's existing catalog photography).

## Deploying

`netlify.toml` is set up for Netlify with `@netlify/plugin-nextjs`. Push to a connected
repo, or `netlify deploy`. The demo needs no environment variables to run — leave
`CATALOG_SOURCE` unset.

## Deploying

Deployed to Netlify from this repository's `main` branch. `netlify.toml` supplies
the build command, Node version and the Next.js plugin, so **Base directory,
Build command and Publish directory must all be left blank** in the Netlify UI —
values typed there override this file and break the build.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_PREVIEW_BANNER` | `true` shows the "Design preview" notice. Set on the preview deploy. |
| `CATALOG_SOURCE` | Leave unset. Unset or `mock` runs on the committed catalog, so the site cannot be broken by a third-party API. `blaze` switches to the live BLAZE ECOM adapter. |
| `ALLOW_INDEXING` | Leave unset. Set to `true` only if this becomes the client's real, AGCO-submitted storefront — it removes the noindex signal. |

### Why this preview is hidden from search

It carries a licensed retailer's real branding, address and prices, so an indexed
result pointing here could be mistaken for their actual storefront. Three layers:

1. `robots.txt` disallows crawling.
2. A `robots` meta tag in `app/layout.tsx` prevents *indexing* — a distinct thing
   from crawling, and the one search engines actually honour. Header-based
   approaches were tried first and verified not to work here: most pages are
   statically prerendered and served from the CDN, so `headers()` in
   `next.config.mjs` never runs, and Netlify's Next handler takes precedence over
   `netlify.toml` header rules.
3. The on-screen "Design preview" notice tells any human visitor directly.

### Git contributors

Netlify's free plan permits one Git contributor on a private repo. Commits must be
authored by the account that owns the Netlify team, or builds are blocked with
"unrecognized Git contributor".
