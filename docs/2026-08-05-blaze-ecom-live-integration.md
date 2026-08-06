# Blaze Cannabis — Live BLAZE ECOM Integration

**Date:** 2026-08-05
**Status:** Draft for review
**Type:** Follow-on phase to `2026-08-04-blaze-cannabis-redesign-design.md`
**Depends on:** that spec's `CatalogSource` interface and its contract test suite

## Context

The pitch build runs on a committed local catalog of 54 real products. The client's
payment rail is **Greenline POS + BLAZEPAY**, and the client wants customers to pay online.

The original spec deferred this as "the Greenline live adapter" and assumed we would call
the Greenline external API. **That assumption was wrong and is corrected here.** Greenline
is the point-of-sale; it does not expose a consumer cart or checkout. Online ordering and
payment run through **BLAZE ECOM**, a headless commerce API, with **BLAZEPAY** as a payment
service behind it. BLAZE ECOM is a separate product from Greenline POS.

Verified live against staging on 2026-08-05: `GET /api/v1/store` and `GET /api/v1/products`
both return data for the documented demo store UUID.

## Goal

Let a customer browse, add to cart, and **pay** without leaving the Nocturne storefront,
with the order landing in the client's Greenline POS.

## Non-goals

- Replacing the mock catalog as the default. The demo must keep working with no network.
- Delivery. The client is pickup-only; `delivery-specification` is set to pickup.
- Loyalty and promo codes. The endpoints exist; not in this phase.
- Customer accounts. `POST /api/v1/auth/login` exists; guest checkout only for now.
- Handling live payment credentials. Those live in env vars supplied by the client.

## The API

Base URL is environment-configured. Staging is `https://ecom-api.staging.blaze.me`.
All requests send `Content-Type`/`Accept: application/vnd.api+json` and `X-Store: <uuid>`.
Product browsing needs no further auth.

| Purpose | Endpoint |
|---|---|
| Store | `GET /api/v1/store` |
| Products | `GET /api/v1/products?limit=&category=&max_price=&order=` |
| Product detail | `GET /api/v2/products/{id\|slug}` |
| Categories | `GET /api/v1/products/categories` |
| Filters | `GET /api/v2/products/filters` |
| Create cart | `POST /api/v5/carts` |
| Add item | `POST /api/v5/carts/{uuid}/items` |
| Amend item | `PATCH` / `DELETE /api/v5/carts/{uuid}/items/{id}` |
| Fulfilment | `PUT /api/v4/carts/{uuid}/delivery-specification` |
| Validate | `POST /api/v5/carts/{uuid}/valid` |
| Create order | `POST /api/v5/orders` |
| **Pay** | `POST /api/v1/store/payments/{service}/orders/{uuid}/pay` |
| Track | `GET /api/v1/orders/{uuid}` |

`{service}` selects the payment provider; **BLAZEPAY is one such service**. Its exact
identifier must come from the client's account and is not documented publicly.

## Architecture

### The seam already exists

`CatalogSource` maps one-to-one onto their read endpoints, which is why this is an adapter
and not a rewrite:

| `CatalogSource` | BLAZE ECOM |
|---|---|
| `listProducts()` | `GET /api/v1/products` |
| `getProduct(slug)` | `GET /api/v2/products/{id\|slug}` |
| `listCategories()` | `GET /api/v1/products/categories` |
| `getStore(id)` | `GET /api/v1/store` |

`BlazeEcomCatalogSource` implements the same interface and **must pass the existing
contract suite** in `tests/catalog-source.contract.ts`. That suite is the acceptance bar.

### Source selection

`getCatalogSource()` reads `CATALOG_SOURCE`:

- unset or `mock` → `MockCatalogSource` (**default**)
- `blaze` → `BlazeEcomCatalogSource`

The default stays mock so a demo cannot be broken by someone else's uptime. Switching is a
env change, not a code change.

### Degradation

A live storefront inherits the API's availability. `BlazeEcomCatalogSource` caches the last
successful catalog response in memory with a short TTL and serves it if a later fetch
fails. If the very first fetch fails, it throws, and the route renders a themed error state
rather than an empty shelf — an empty menu reads as "this shop has nothing", which is worse
than an honest error.

### Field mapping

Their product shape differs from ours and the mapping is where bugs will hide:

- **CORRECTED 2026-08-05, after reading real payloads.** This spec originally said `price`
  is in dollars and must be multiplied by 100. **That was wrong.** `unit_price.amount` is
  already an integer in **cents** — proven by a gift card whose own `display_name` is
  `"$10"` carrying `amount: 1000`. Multiplying would have made every price 100× too high.
  Verified against the staging demo store only; **re-confirm against the client's real
  store before any live payment is taken.**
- `on_sale` is a boolean; a sale price must be derived, not assumed.
- `main_image` is a remote URL. Our current spec forbids remote images at runtime — that
  rule existed to keep the *demo* self-contained. Under `CATALOG_SOURCE=blaze` remote
  images are expected, so `next.config.mjs` gains a `remotePatterns` entry for their image
  host. The mock path keeps using local files.
- `external_id`, `strain`, `thc`, `composition` map onto our `Product` where present and
  `null` where absent. **Absent stays absent** — no invented values.

### Cart and checkout

The local cart (`lib/cart.ts`) stays as the UI's state. On checkout it is *replayed* into a
BLAZE cart: create, add each line, set pickup, validate, then create the order. This keeps
the fast local cart interaction and defers all network work to checkout.

Checkout surfaces: contact details → order review → payment → confirmation with order
number. Payment posts to the pay endpoint with the configured service.

All BLAZE calls happen **server-side** in route handlers. No credential and no base URL
reaches the browser.

## Catalog scale — an architectural consequence found in Phase 1

The staging store holds **1,739 products**, and `GET /api/v1/products` caps `limit` at
**100**. The pitch build's menu loads the entire catalog into the client and filters,
sorts, and searches it in memory — which is what makes it feel instant, and which is sound
for 54 products. **It does not hold at 1,739.**

Going live therefore requires the menu to push filtering to the API, using the `category`,
`max_price`, and `order` parameters that already exist, plus paging. That is a real change
to `MenuBrowser` and to how `CatalogSource.listProducts()` is shaped — likely an options
argument for filter, sort, and page.

This is deliberately **not** in phases 1–3. It does not block cart, order, or payment, and
the client's own store may hold far fewer than 1,739 lines. Size their real catalog first,
then decide: under a few hundred, the current approach survives with a raised page count;
beyond that, server-side filtering is required.

## Phasing

1. **Live catalog.** `BlazeEcomCatalogSource` + mapper + source selection + degradation.
   Passes the contract suite against staging. Storefront unchanged.
2. **Cart and order.** Replay to a BLAZE cart, validate, create order. Checkout replaces
   the terminal "Reserve for pickup".
3. **Payment.** The pay call, built so BLAZEPAY drops in by identifier. Until the client
   supplies theirs, a `pay-on-pickup` path stands in.

## Testing

- The existing `runCatalogSourceContract` suite, run against `BlazeEcomCatalogSource`
  pointed at staging. This is the whole point of having written it.
- Unit tests for the field mapper, especially dollars→cents and absent-field handling,
  against captured fixture payloads so they run offline.
- Cart-replay tests against recorded responses.
- Payment is verified against staging only; live payment is the client's to confirm.

## Open items — blocked on the client

1. Store UUID.
2. Production base URL.
3. **Confirmation their account is provisioned for BLAZE ECOM**, not Greenline POS alone.
   If not, e-commerce must be added to their account before any of this functions. This is
   the item most likely to block, and it is commercial rather than technical.
4. BLAZEPAY enabled, and its `{service}` identifier.
5. Whether a partner or API agreement is required.

Phases 1 and 2 are built and tested against the documented staging store, so none of the
above blocks starting.

## Phase 2 outcome — the last hop is unproven

Phase 1 passed the contract suite 12/12 against live staging. Phase 2 verified cart
creation, item addition, pickup specification, and validation against **real responses**,
including a real out-of-stock rejection and real validated pricing.

**Order submission never succeeded.** Four attempts, three by direct call and one through
the real browser UI, all returned `submission_status: "failed"` with
`"Unexpected error communicating with the store."` That failure originates in BLAZE's own
bridge to the POS behind the demo store — it is exactly the provisioning gap open item 3
predicts, arriving one layer lower than expected.

The consequence: **everything up to order submission is proven, and the submission hop
itself can only be proven against a real, fully provisioned store.** The read-back
endpoints are likewise unverified against real data.

This makes open item 3 the critical path, not a formality. Until the client's store is
confirmed provisioned for BLAZE ECOM, neither order creation nor payment can be exercised
anywhere.

**Phase 3 is therefore deliberately not started.** Payment requires both a working order
and the BLAZEPAY `{service}` identifier, and neither exists yet. Writing it now would be
code with nothing to test it against.

### Carried concerns for when a real store exists

- The route handler polls for up to 60s for asynchronous order submission. That is
  acceptable for a demo and questionable in production; revisit webhooks once real order
  behaviour is observable.
- Pickup is ASAP only. No scheduled-slot UI was built, because their slot API could not be
  verified — deliberately scoped down rather than guessed.
