/**
 * Low-level HTTP client for BLAZE ECOM's cart/checkout/order endpoints. Mirrors the
 * request conventions established in blaze-ecom-source.ts (Phase 1): same headers,
 * same base-URL handling, same fetchImpl injection for tests. That file's job is
 * reading the catalog; this one's job is the cart-replay + order sequence, which has
 * a materially different (and, as noted below, materially undocumented) shape.
 *
 * Every request/response shape below was captured by exercising the real staging API
 * (store e87437f2-3e35-4738-af5e-6307e368255c) on 2026-08-06, NOT by trusting
 * https://blaze-ecom-api.apidocumentation.com's worked examples — those examples
 * turned out to be materially wrong in multiple ways (see the doc comments on each
 * method). This continues the practice Phase 1 established: verify against the real
 * payload before trusting a written spec. Full findings are in
 * `.superpowers/sdd/live-phase2-report.md`.
 */

export interface BlazeCheckoutClientOptions {
  baseUrl: string;
  storeUuid: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** How often to re-check an in-flight order submission, in ms. */
  pollIntervalMs?: number;
  /** Total time budget for polling before giving up and reporting "still pending". */
  pollTimeoutMs?: number;
}

/** The fetch call itself failed — DNS, offline, connection refused, timeout. We never
 * got an HTTP response to reason about. */
export class BlazeNetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BlazeNetworkError';
  }
}

export interface BlazeApiErrorDetail {
  code?: string;
  status?: number | string;
  detail?: string;
  fields?: string[];
}

/** We got an HTTP response, but it was an error. Carries BLAZE's own `errors[]` body
 * (verified real shape: `{errors:[{code,status,fields,extra_info,detail}]}`) so
 * callers can distinguish "customer-actionable" errors (e.g. product_out_of_stock)
 * from ones that mean our own request was malformed. */
export class BlazeApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly errors: BlazeApiErrorDetail[],
  ) {
    super(message);
    this.name = 'BlazeApiError';
  }
}

const DEFAULT_POLL_INTERVAL_MS = 3_000;
// Live testing against the staging demo store showed submission taking anywhere from
// ~35s to ~100s before reaching a terminal "failed" state across three separate
// attempts (see pollForSubmission's doc comment). 60s is a compromise: patient enough
// to catch most of that range, short enough not to hold a route handler open
// indefinitely. A synchronous poll loop is itself a UX/infra concern worth revisiting
// before real deployment — see the phase report's "Concerns" section.
const DEFAULT_POLL_TIMEOUT_MS = 60_000;

export interface BlazeCartSubmissionStatus {
  status: string;
  errors: BlazeApiErrorDetail[];
}

export interface BlazeOrderResult {
  orderNumber: string;
  totalCents: number | null;
  status: string | null;
}

export class BlazeCheckoutClient {
  private readonly baseUrl: string;
  private readonly storeUuid: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;

  constructor(options: BlazeCheckoutClientOptions) {
    if (!options.baseUrl) throw new Error('BlazeCheckoutClient requires a baseUrl.');
    if (!options.storeUuid) throw new Error('BlazeCheckoutClient requires a storeUuid.');
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.storeUuid = options.storeUuid;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.pollTimeoutMs = options.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      'X-Store': this.storeUuid,
    };
  }

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers: this.headers() });
    } catch (error) {
      throw new BlazeNetworkError(`Could not reach BLAZE ECOM (${path})`, error);
    }

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null; // Non-JSON body (e.g. an HTML error page) — treated as absent below.
      }
    }

    if (!response.ok) {
      const errors =
        body && typeof body === 'object' && Array.isArray((body as { errors?: unknown }).errors)
          ? ((body as { errors: BlazeApiErrorDetail[] }).errors)
          : [{ detail: response.statusText || `HTTP ${response.status}`, status: response.status }];
      throw new BlazeApiError(`BLAZE ECOM request failed: ${response.status} (${path})`, response.status, errors);
    }

    return body;
  }

  /**
   * BLAZE ECOM's cart endpoints reject a product's `slug` or `external_id` with
   * `invalid_product_id` — verified live. They require the resource's numeric `id`
   * (e.g. `490`), which our mapped `Product.id` does NOT carry (Phase 1 maps
   * `Product.id` to `external_id` for catalog display, and never exposes the numeric
   * id — see blaze-ecom-mapper.ts). This resolves it fresh via the same v2 detail
   * endpoint the catalog source already uses, reading the numeric id off the raw
   * payload before it would be mapped away.
   */
  async resolveProductId(slug: string): Promise<string | null> {
    try {
      const payload = (await this.request(`/api/v2/products/${encodeURIComponent(slug)}`)) as
        | { data?: { id?: number | string } }
        | null;
      if (!payload?.data || payload.data.id === undefined || payload.data.id === null) return null;
      return String(payload.data.id);
    } catch (error) {
      // A removed/renamed product 404s here — that is a genuine "this line can't be
      // ordered" case (replay.ts turns a null return into validation_failed), not an
      // unexpected error, so it's handled the same way findOrderUuidByCart handles a
      // 404: swallow it into `null` rather than letting it throw as api_error.
      if (error instanceof BlazeApiError && error.httpStatus === 404) return null;
      throw error;
    }
  }

  /**
   * `POST /api/v5/carts`. The published example
   * (blaze-ecom-api.apidocumentation.com) shows `delivery_specification: "pickup"`
   * as a bare string — that shape is rejected live with
   * `invalid_delivery_specification`. The real accepted shape nests it as an object:
   * `delivery_specification: { type: "pickup" }`. Also: the real response has no
   * `subtotal`/`total`/`tax` on the cart itself (unlike the doc's example) — pricing
   * only appears from the `/valid` endpoint (see validateCart below).
   *
   * `inventory_type: "recreational"` is hardcoded, not configurable: this client is a
   * licensed Ontario adult-use retailer, which is the only inventory classification
   * that applies (Ontario has no medical-cannabis retail channel). Verified to be
   * accepted live.
   */
  async createCart(item: { productId: string; quantity: number }): Promise<{ cartUuid: string }> {
    const body = {
      data: {
        type: 'carts',
        attributes: {
          delivery_specification: { type: 'pickup' },
          inventory_type: 'recreational',
          item: { product_id: item.productId, quantity: item.quantity },
        },
      },
    };
    const payload = (await this.request('/api/v5/carts', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { data: { id: string } };
    return { cartUuid: payload.data.id };
  }

  /** `POST /api/v5/carts/{uuid}/items`. This shape from the published docs matched
   * live behavior (unlike cart creation) — confirmed by getting a genuine
   * `product_out_of_stock` business error back rather than a shape-rejection error. */
  async addItem(cartUuid: string, item: { productId: string; quantity: number }): Promise<void> {
    const body = { data: { type: 'cart_items', attributes: { product_id: item.productId, quantity: item.quantity } } };
    await this.request(`/api/v5/carts/${encodeURIComponent(cartUuid)}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * `PUT /api/v4/carts/{uuid}/delivery-specification`. The published example's shape
   * (`data.type: "delivery_specifications"`) is rejected live with "Missing type in
   * data parameter". The real accepted shape addresses the cart resource directly:
   * `data: { type: "carts", id: cartUuid, attributes: { type: "pickup", mode: "asap" } }`.
   * Cart creation already sets pickup, so this is close to redundant for our flow —
   * called anyway because the phase's endpoint sequence calls for it explicitly, and
   * it is where a scheduled pickup time would be set if BLAZE's `mode`/
   * `scheduled_start_time` fields are wired up in a later phase.
   */
  async setPickup(cartUuid: string): Promise<void> {
    const body = { data: { type: 'carts', id: cartUuid, attributes: { type: 'pickup', mode: 'asap' } } };
    await this.request(`/api/v4/carts/${encodeURIComponent(cartUuid)}/delivery-specification`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * `POST /api/v5/carts/{uuid}/valid`. Real response type is `cart_prices`, not an
   * echo of the cart. All money fields use the same `{amount, currency}` shape as
   * everywhere else in this API, and — consistent with Phase 1's cents-not-dollars
   * finding for `unit_price.amount` — `amount` here is already integer cents too
   * (verified: two items at $8.00-sale and $60.00×2 summed to `sub_total.amount:
   * 12800`, i.e. 128.00 dollars in cents, not 12800 dollars). The doc's example
   * (`"total": 49.28`) is a fabricated dollars-decimal shape that does not match live
   * data and was not trusted.
   */
  async validateCart(cartUuid: string): Promise<{ totalCents: number | null }> {
    const body = { data: { type: 'carts', attributes: { promo_codes: [], reward_id: null } } };
    const payload = (await this.request(`/api/v5/carts/${encodeURIComponent(cartUuid)}/valid`, {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { data?: { attributes?: { total?: { amount?: number } } } } | null;
    const amount = payload?.data?.attributes?.total?.amount;
    return { totalCents: typeof amount === 'number' ? Math.round(amount) : null };
  }

  /**
   * `POST /api/v5/orders`. This is the biggest divergence from the published docs,
   * which show a synchronous response containing a ready order with its own uuid.
   * Live, the response is the *cart* (`type: "carts"`) with `submission_status:
   * "pending"` — order creation is asynchronous. There is no order uuid in this
   * response at all. Callers must poll (see pollForSubmission) until the cart's
   * `submission_status` reaches a terminal state.
   */
  async submitOrder(cartUuid: string): Promise<void> {
    const body = { data: { type: 'orders', attributes: { cart_uuid: cartUuid } } };
    await this.request('/api/v5/orders', { method: 'POST', body: JSON.stringify(body) });
  }

  /** `GET /api/v5/carts/{uuid}` — used to poll `submission_status` after
   * submitOrder(). Verified live values: "pending", "processing", "failed". "done"
   * was never observed in testing (see class doc comment on pollForSubmission). */
  async getCartSubmissionStatus(cartUuid: string): Promise<BlazeCartSubmissionStatus> {
    const payload = (await this.request(`/api/v5/carts/${encodeURIComponent(cartUuid)}`)) as
      | { data?: { attributes?: { submission_status?: string | null; submission_errors?: BlazeApiErrorDetail[] } } }
      | null;
    return {
      status: payload?.data?.attributes?.submission_status ?? 'unknown',
      errors: payload?.data?.attributes?.submission_errors ?? [],
    };
  }

  /**
   * `GET /api/v1/carts/{uuid}/order` — looks up the order created from a cart once
   * submission finishes. NOT independently verified: in live testing, cart order
   * submission never reached a "done" `submission_status` (see
   * `.superpowers/sdd/live-phase2-report.md`), so this path — the only one that would
   * exercise it — could not be confirmed end-to-end. It is included because it is the
   * documented lookup-by-cart endpoint and is the best available option once
   * submission does complete. Returns null on a 404 (no order yet / never created).
   */
  async findOrderUuidByCart(cartUuid: string): Promise<string | null> {
    try {
      const payload = (await this.request(`/api/v1/carts/${encodeURIComponent(cartUuid)}/order`)) as
        | { data?: { id?: string } }
        | null;
      return payload?.data?.id ?? null;
    } catch (error) {
      if (error instanceof BlazeApiError && error.httpStatus === 404) return null;
      throw error;
    }
  }

  /** `GET /api/v1/orders/{uuid}`. Also not independently verified (see
   * findOrderUuidByCart) — no real order was ever created to read back. Parses
   * defensively: tries several plausible "human order number" fields before falling
   * back to the order's own uuid, which is guaranteed to exist on any JSON:API
   * resource regardless of which of those fields BLAZE actually uses. */
  async getOrder(orderUuid: string): Promise<BlazeOrderResult> {
    const payload = (await this.request(`/api/v1/orders/${encodeURIComponent(orderUuid)}`)) as
      | { data?: { id?: string; attributes?: Record<string, unknown> } }
      | null;
    const attrs = payload?.data?.attributes ?? {};
    const orderNumber =
      (typeof attrs.order_number === 'string' && attrs.order_number) ||
      (typeof attrs.number === 'string' && attrs.number) ||
      (typeof attrs.uuid === 'string' && attrs.uuid) ||
      payload?.data?.id ||
      orderUuid;
    const totalAttr = attrs.total as { amount?: number } | number | undefined;
    const totalCents =
      typeof totalAttr === 'number'
        ? Math.round(totalAttr)
        : typeof totalAttr?.amount === 'number'
          ? Math.round(totalAttr.amount)
          : null;
    const status = typeof attrs.status === 'string' ? attrs.status : null;
    return { orderNumber: String(orderNumber), totalCents, status };
  }

  /**
   * Polls `getCartSubmissionStatus` until it reaches "done" or "failed", or until
   * `pollTimeoutMs` elapses. In live testing against the staging demo store,
   * submission consistently reached "failed" — never "done" — after 35-70 seconds,
   * with `submission_errors: [{code: "bad_request", detail: "Unexpected error
   * communicating with the store."}]`. That reads as the demo store's POS bridge not
   * being fully wired up, matching the design spec's own predicted blocker ("Open
   * items" #3: confirm the client's account is provisioned for BLAZE ECOM, not
   * Greenline POS alone) — not a defect in this client. See the phase report for the
   * full trace.
   *
   * Returns the last known status if the timeout is hit without a terminal state;
   * callers must treat that as "still pending", not as success or failure — the
   * caller genuinely does not know what happens next, and must not claim the order
   * definitely did or didn't go through.
   */
  async pollForSubmission(cartUuid: string): Promise<BlazeCartSubmissionStatus> {
    const deadline = Date.now() + this.pollTimeoutMs;
    let last: BlazeCartSubmissionStatus = { status: 'pending', errors: [] };
    while (Date.now() < deadline) {
      last = await this.getCartSubmissionStatus(cartUuid);
      if (last.status === 'done' || last.status === 'failed') return last;
      await sleep(this.pollIntervalMs);
    }
    return last;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
