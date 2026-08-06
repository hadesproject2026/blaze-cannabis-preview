# Blaze Cannabis Storefront Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed, motion-led recreation of the Blaze Cannabis Brampton storefront that runs entirely on local data, so it can be demoed to the client without depending on a live third-party API.

**Architecture:** Next.js 14 App Router. All catalog reads go through a single `CatalogSource` interface with async methods; this cycle ships a `MockCatalogSource` backed by a committed `data/catalog.json`, and a shared contract test suite that any future implementation (the live Greenline adapter) must also pass. Server components load the catalog and hand it to client components, which do all filtering, sorting, and searching in memory. Cart state is a separate React context over localStorage and never touches the catalog.

**Tech Stack:** Next.js 14.2.5, React 18.3.1, TypeScript 5.5.3, Vitest 2.0.5 + @testing-library/react + jsdom, Zod 3.23.8 (data validation only), plain CSS Modules + CSS custom properties. No animation library. Deploys to Netlify.

## Global Constraints

- **Project root is `blaze/`** at the repo root, matching the one-directory-per-project pattern (`klyq/`, `chatify-mock-chat/`, `model-allocations/`). All paths below are relative to the repo root.
- **Work happens on branch `feat/blaze-redesign`**, which already exists and holds the spec commit.
- **No animation library.** Motion is CSS keyframes plus small hooks. Adding Framer Motion, GSAP, or similar is a plan violation.
- **No external CDN at runtime** — no font CDN, no remote images. Product images are downloaded into `public/products/` by the seed script.
- **Fonts are self-hosted and already downloaded.** `blaze/public/fonts/fraunces-var-latin.woff2` (display, 67 kb) and `blaze/public/fonts/inter-var-latin.woff2` (UI, 48 kb) — latin-subset variable woff2, SIL Open Font License. Both files exist; do not re-download them, and do not add a `next/font/google` import or any `fonts.googleapis.com` link.
- **Every `CatalogSource` method is async**, including on the mock, even though the mock reads a local file synchronously.
- **All ambient motion animates `transform` and `opacity` only.** Never animate properties that trigger layout.
- **`prefers-reduced-motion: reduce` disables every ambient loop and scroll reveal.** Not a user toggle — an OS-level accessibility requirement.
- **Nocturne palette, exact values:**
  `--bg #08090C`, `--surface #111319`, `--surface-2 #171A22`, `--border #20242F`, `--border-strong #2A3040`, `--text #ECEEF2`, `--text-muted #7A8094`, `--accent #34D399`, `--accent-press #22B87F`, `--gold #C8B78A`, `--gold-dim rgba(200,183,138,.35)`, `--danger #F87171`, `--spot-yellow #FFE000`.
- **`--spot-yellow` is used only on `new-drop` and `on-sale` badges.** Nowhere else.
- **Motion tokens:** `--dur-fast 150ms`, `--dur 280ms`, `--dur-slow 600ms`, `--ease-out cubic-bezier(.16, 1, .3, 1)`. Ambient loops run 6–16s.
- **Copy contains no health, medical, or lifestyle claims**, and no imagery or language appealing to minors (AGCO rules for a licensed Ontario retailer).
- **Responsive verification at 390px and 1440px** is required before any task claims completion for a task that renders UI.
- **Screenshots are not available in this environment.** The Browser pane cannot composite frames, so `computer{action:"screenshot"}` fails. Wherever a step says "screenshot", substitute programmatic checks via `javascript_tool` — `getComputedStyle`, `getBoundingClientRect`, `scrollWidth` vs `clientWidth` — plus `read_page` for structure and `read_console_messages` for errors. Never fake a screenshot, never claim a visual check you did not perform, and state plainly in your report which facts you verified programmatically. Final aesthetic judgement is the human's, made against the running dev server.
- **Storage keys:** cart is `blaze.cart.v1`, age gate is `blaze.age-verified.v1`.
- **Commit after every task.** Conventional commits, scope `blaze`.

**One refinement against the spec:** the spec writes `getStore(id: string): Promise<Store>`. This plan uses `Promise<Store | null>` so an unknown store id is representable, matching `getProduct`. The contract suite tests the null case.

---

## File Structure

```
blaze/
  package.json                     deps + scripts
  tsconfig.json
  next.config.mjs
  vitest.config.ts
  vitest.setup.ts
  netlify.toml
  app/
    layout.tsx                     root shell, fonts, providers
    globals.css                    Nocturne tokens, resets, motion tokens
    page.tsx                       landing (server)
    menu/brampton/page.tsx         menu (server)
    product/[slug]/page.tsx        product detail (server)
    not-found.tsx                  themed 404
  components/
    shell/     SiteHeader, SiteFooter, AgeGate
    landing/   LivingCatalogueHero, CategoryQuickGrid, BudtenderRail, StoreBlock, Reveal
    menu/      MenuBrowser, CategoryChips, SortSelect, FilterPanel, ProductGrid, ProductCard, EmptyState
    product/   ProductDetail, QuantityStepper, BrandRail
    cart/      CartProvider, CartDrawer, CartButton
  lib/
    catalog/   types.ts, source.ts, mock-source.ts, index.ts
    format.ts                      price + potency formatting
    filters.ts                     filter predicates, sort comparators, search
    cart.ts                        cart reducer + selectors (pure)
    motion/    useReducedMotion, useInViewPaused, usePointerParallax
  data/catalog.json                ~50 products, committed
  public/products/                 downloaded product images, committed
  scripts/seed-catalog.ts          one-time seeding, not run at build
  tests/
    catalog-source.contract.ts     shared suite, exported as a function
    mock-source.test.ts
    catalog-data.test.ts
    format.test.ts
    filters.test.ts
    cart.test.ts
    age-gate.test.ts
```

Each `lib/` module has one responsibility and no React imports, so it is testable without a DOM. Components import from `lib/`, never the reverse.

---

### Task 1: Project scaffold and Nocturne design tokens

**Files:**
- Create: `blaze/package.json`, `blaze/tsconfig.json`, `blaze/next.config.mjs`, `blaze/vitest.config.ts`, `blaze/vitest.setup.ts`, `blaze/.gitignore`
- Create: `blaze/app/globals.css`, `blaze/app/layout.tsx`, `blaze/app/page.tsx`
- Create: `blaze/tests/tokens.test.ts`
- Already present, do not create or re-download: `blaze/public/fonts/fraunces-var-latin.woff2`, `blaze/public/fonts/inter-var-latin.woff2`

**Interfaces:**
- Consumes: nothing.
- Produces: a booting Next app; the CSS custom properties every later task styles against; a working `npm test` command.

- [ ] **Step 1: Create `blaze/package.json`**

```json
{
  "name": "blaze",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "tsx scripts/seed-catalog.ts"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "20.14.0",
    "@types/react": "18.3.3",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^24.1.1",
    "tsx": "^4.16.2",
    "typescript": "5.5.3",
    "vitest": "2.0.5",
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 2: Create `blaze/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `blaze/next.config.mjs` and `blaze/.gitignore`**

`blaze/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'] },
};

export default nextConfig;
```

`blaze/.gitignore`:

```
node_modules/
.next/
next-env.d.ts
.env.local
```

- [ ] **Step 4: Create `blaze/vitest.config.ts` and `blaze/vitest.setup.ts`**

`blaze/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

`blaze/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
```

- [ ] **Step 5: Write the failing token test**

`blaze/tests/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

const REQUIRED = {
  '--bg': '#08090C',
  '--surface': '#111319',
  '--surface-2': '#171A22',
  '--border': '#20242F',
  '--border-strong': '#2A3040',
  '--text': '#ECEEF2',
  '--text-muted': '#7A8094',
  '--accent': '#34D399',
  '--accent-press': '#22B87F',
  '--gold': '#C8B78A',
  '--danger': '#F87171',
  '--spot-yellow': '#FFE000',
};

describe('Nocturne design tokens', () => {
  for (const [token, value] of Object.entries(REQUIRED)) {
    it(`defines ${token} as ${value}`, () => {
      expect(css).toContain(`${token}: ${value}`);
    });
  }

  it('defines the motion duration tokens', () => {
    expect(css).toContain('--dur-fast: 150ms');
    expect(css).toContain('--dur: 280ms');
    expect(css).toContain('--dur-slow: 600ms');
  });

  it('disables ambient motion under prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('self-hosts both fonts and references no font CDN', () => {
    expect(css).toContain("url('/fonts/fraunces-var-latin.woff2')");
    expect(css).toContain("url('/fonts/inter-var-latin.woff2')");
    expect(css).not.toContain('fonts.googleapis.com');
    expect(css).not.toContain('fonts.gstatic.com');
  });

  it('points the font tokens at the self-hosted families', () => {
    expect(css).toContain("--font-display: 'Fraunces'");
    expect(css).toContain("--font-ui: 'Inter'");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd blaze && npm install && npm test -- tests/tokens.test.ts
```

Expected: FAIL — `ENOENT: no such file or directory ... app/globals.css`

- [ ] **Step 7: Create `blaze/app/globals.css`**

```css
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces-var-latin.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var-latin.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --bg: #08090C;
  --surface: #111319;
  --surface-2: #171A22;
  --border: #20242F;
  --border-strong: #2A3040;
  --text: #ECEEF2;
  --text-muted: #7A8094;
  --accent: #34D399;
  --accent-press: #22B87F;
  --gold: #C8B78A;
  --gold-dim: rgba(200, 183, 138, 0.35);
  --danger: #F87171;
  --spot-yellow: #FFE000;
  --header-bg: rgba(8, 9, 12, 0.82);

  --dur-fast: 150ms;
  --dur: 280ms;
  --dur-slow: 600ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  --radius: 12px;
  --radius-sm: 8px;
  --maxw: 1280px;

  --font-ui: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Fraunces', ui-serif, Georgia, 'Times New Roman', serif;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }

a { color: inherit; text-decoration: none; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.container { width: 100%; max-width: var(--maxw); margin: 0 auto; padding: 0 20px; }

.hairline { height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }

.kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 8: Create `blaze/app/layout.tsx` and `blaze/app/page.tsx`**

`blaze/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blaze Cannabis — Brampton',
  description: 'Browse the Blaze Cannabis Brampton menu and reserve for pickup.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`blaze/app/page.tsx`:

```tsx
export default function LandingPage() {
  return (
    <main className="container" style={{ paddingTop: 80 }}>
      <p className="kicker">Now open · Brampton</p>
      <h1 style={{ fontSize: 48, margin: '12px 0 20px' }}>Curated, not stocked.</h1>
      <div className="hairline" />
    </main>
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
cd blaze && npm test -- tests/tokens.test.ts
```

Expected: PASS — 15 passed

- [ ] **Step 10: Verify the app boots**

Start the dev server with the preview tool (never `npm run dev` via a shell), then screenshot:

Create `.claude/launch.json` at the repo root if it does not exist:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "blaze", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000, "cwd": "blaze" }
  ]
}
```

Then `preview_start` with `{name: "blaze"}` and screenshot. Expected: near-black page, champagne kicker text, serif headline, gold hairline.

- [ ] **Step 11: Commit**

```bash
git add blaze/ .claude/launch.json
git commit -m "feat(blaze): scaffold Next 14 app with Nocturne design tokens"
```

---

### Task 2: Catalog types, `CatalogSource` interface, and the contract suite

This is the architectural heart of the build. The contract suite written here is what the future Greenline adapter will be verified against, so it must test behaviour, not implementation.

**Files:**
- Create: `blaze/lib/catalog/types.ts`, `blaze/lib/catalog/source.ts`, `blaze/lib/catalog/mock-source.ts`, `blaze/lib/catalog/index.ts`
- Create: `blaze/tests/catalog-source.contract.ts`, `blaze/tests/mock-source.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Product`, `Category`, `Store`, `StrainType`, `PotencyRange`, `PotencyUnit`, `ProductBadge`, `CatalogSource`, `MockCatalogSource`, `getCatalogSource()`, and `runCatalogSourceContract(name, factory)`.

- [ ] **Step 1: Create `blaze/lib/catalog/types.ts`**

```ts
export type StrainType = 'indica-dominant' | 'sativa-dominant' | 'hybrid' | 'cbd';
export type PotencyUnit = '%' | 'mg/g';
export type ProductBadge = 'new-drop' | 'staff-pick' | 'on-sale';

export interface PotencyRange {
  min: number;
  max: number;
  unit: PotencyUnit;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  strainType: StrainType | null;
  thc: PotencyRange | null;
  cbd: PotencyRange | null;
  size: string;
  priceCents: number;
  salePriceCents: number | null;
  inStock: boolean;
  images: string[];
  description: string;
  terpenes: string[];
  effects: string[];
  badges: ProductBadge[];
  addedAt: string;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
}

export interface StoreHours {
  day: string;
  open: string;
  close: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  hours: StoreHours[];
}
```

- [ ] **Step 2: Create `blaze/lib/catalog/source.ts`**

```ts
import type { Category, Product, Store } from './types';

export interface CatalogSource {
  listProducts(): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  getStore(id: string): Promise<Store | null>;
}
```

- [ ] **Step 3: Write the failing contract suite**

`blaze/tests/catalog-source.contract.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { CatalogSource } from '@/lib/catalog/source';

export interface CatalogSourceContractOptions {
  /** A store id the implementation under test is expected to resolve. */
  knownStoreId: string;
}

export function runCatalogSourceContract(
  name: string,
  createSource: () => CatalogSource | Promise<CatalogSource>,
  options: CatalogSourceContractOptions,
) {
  describe(`CatalogSource contract: ${name}`, () => {
    it('lists at least one product', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('returns products with unique slugs', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const slugs = products.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('returns products with unique ids', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const ids = products.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('resolves a known slug to the matching product', async () => {
      const source = await createSource();
      const [first] = await source.listProducts();
      const found = await source.getProduct(first.slug);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);
    });

    it('resolves an unknown slug to null rather than throwing', async () => {
      const source = await createSource();
      await expect(source.getProduct('definitely-not-a-real-slug')).resolves.toBeNull();
    });

    it('lists categories with unique slugs', async () => {
      const source = await createSource();
      const categories = await source.listCategories();
      expect(categories.length).toBeGreaterThan(0);
      const slugs = categories.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('only returns products whose category exists in listCategories', async () => {
      const source = await createSource();
      const categories = await source.listCategories();
      const known = new Set(categories.map((c) => c.slug));
      const products = await source.listProducts();
      const orphans = products.filter((p) => !known.has(p.category));
      expect(orphans.map((p) => `${p.slug} -> ${p.category}`)).toEqual([]);
    });

    it('resolves a known store id', async () => {
      const source = await createSource();
      const store = await source.getStore(options.knownStoreId);
      expect(store).not.toBeNull();
      expect(store?.id).toBe(options.knownStoreId);
    });

    it('resolves an unknown store id to null rather than throwing', async () => {
      const source = await createSource();
      await expect(source.getStore('atlantis')).resolves.toBeNull();
    });

    it('never returns a negative price', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      expect(products.filter((p) => p.priceCents < 0)).toEqual([]);
    });

    it('returns a sale price below the regular price whenever one is set', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const bad = products.filter(
        (p) => p.salePriceCents !== null && p.salePriceCents >= p.priceCents,
      );
      expect(bad.map((p) => p.slug)).toEqual([]);
    });

    it('returns potency ranges where min never exceeds max', async () => {
      const source = await createSource();
      const products = await source.listProducts();
      const bad = products.filter(
        (p) => (p.thc && p.thc.min > p.thc.max) || (p.cbd && p.cbd.min > p.cbd.max),
      );
      expect(bad.map((p) => p.slug)).toEqual([]);
    });
  });
}
```

`blaze/tests/mock-source.test.ts`:

```ts
import { MockCatalogSource } from '@/lib/catalog/mock-source';
import { runCatalogSourceContract } from './catalog-source.contract';

runCatalogSourceContract('MockCatalogSource', () => new MockCatalogSource(), {
  knownStoreId: 'brampton',
});
```

The options argument is **required, not optional**. An optional one could be silently omitted by a future implementation, quietly skipping the store assertion — which is the coupling this parameter exists to remove.

- [ ] **Step 4: Run the tests to verify they fail**

```bash
cd blaze && npm test -- tests/mock-source.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/catalog/mock-source"`

- [ ] **Step 5: Create a minimal `blaze/data/catalog.json`**

Task 3 replaces this with ~50 real products. This fixture exists only to make the contract pass now.

```json
{
  "store": {
    "id": "brampton",
    "name": "Blaze Cannabis — Brampton",
    "address": "1 Main Street North",
    "city": "Brampton",
    "province": "ON",
    "postalCode": "L6X 1M1",
    "phone": "(905) 000-0000",
    "hours": [
      { "day": "Mon-Sat", "open": "9:00 AM", "close": "11:00 PM" },
      { "day": "Sun", "open": "10:00 AM", "close": "10:00 PM" }
    ]
  },
  "categories": [
    { "slug": "pre-rolls", "name": "Pre-rolls", "blurb": "Ready to go, rolled and packed." }
  ],
  "products": [
    {
      "id": "p-0001",
      "slug": "orange-tingz-pre-roll-3x0-5g",
      "name": "Orange Tingz Pre-Roll 3x0.5g",
      "brand": "Pistol and Paris",
      "category": "pre-rolls",
      "strainType": "indica-dominant",
      "thc": { "min": 230, "max": 300, "unit": "mg/g" },
      "cbd": null,
      "size": "1.5 g",
      "priceCents": 2400,
      "salePriceCents": null,
      "inStock": true,
      "images": [],
      "description": "A three-pack of half-gram pre-rolls.",
      "terpenes": ["Limonene", "Myrcene"],
      "effects": ["Relaxed"],
      "badges": ["staff-pick"],
      "addedAt": "2026-07-01"
    }
  ]
}
```

- [ ] **Step 6: Create `blaze/lib/catalog/mock-source.ts`**

```ts
import type { CatalogSource } from './source';
import type { Category, Product, Store } from './types';
import catalog from '@/data/catalog.json';

interface CatalogFile {
  store: Store;
  categories: Category[];
  products: Product[];
}

const data = catalog as unknown as CatalogFile;

export class MockCatalogSource implements CatalogSource {
  async listProducts(): Promise<Product[]> {
    return data.products;
  }

  async getProduct(slug: string): Promise<Product | null> {
    return data.products.find((p) => p.slug === slug) ?? null;
  }

  async listCategories(): Promise<Category[]> {
    return data.categories;
  }

  async getStore(id: string): Promise<Store | null> {
    return data.store.id === id ? data.store : null;
  }
}
```

- [ ] **Step 7: Create `blaze/lib/catalog/index.ts`**

```ts
import { MockCatalogSource } from './mock-source';
import type { CatalogSource } from './source';

let cached: CatalogSource | null = null;

export function getCatalogSource(): CatalogSource {
  if (!cached) cached = new MockCatalogSource();
  return cached;
}

export type { CatalogSource } from './source';
export * from './types';
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
cd blaze && npm test -- tests/mock-source.test.ts
```

Expected: PASS — 12 passed

- [ ] **Step 9: Commit**

```bash
git add blaze/lib/catalog blaze/tests blaze/data
git commit -m "feat(blaze): CatalogSource interface, mock implementation, and contract suite"
```

---

### Task 3: Seed the real catalog and enforce data integrity

**Files:**
- Create: `blaze/scripts/seed-catalog.ts`
- Modify: `blaze/data/catalog.json` (replace the fixture with ~50 products)
- Create: `blaze/public/products/` (downloaded images)
- Create: `blaze/tests/catalog-data.test.ts`

**Interfaces:**
- Consumes: `Product`, `Category`, `Store` from Task 2.
- Produces: a populated `data/catalog.json` and local images under `public/products/`.

- [ ] **Step 1: Write the failing data integrity test**

`blaze/tests/catalog-data.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd blaze && npm test -- tests/catalog-data.test.ts
```

Expected: FAIL — "holds at least 45 products" fails with `1` received, plus the category assertions.

- [ ] **Step 3: Write `blaze/scripts/seed-catalog.ts`**

```ts
/**
 * One-time catalog seeder. Run manually with `npm run seed`.
 * NEVER wire this into the build — the demo must not depend on a network
 * call to a site we do not control.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MENU_URL = 'https://shopblaze.ca/menu/brampton/';
const OUT_JSON = path.resolve(process.cwd(), 'data/catalog.json');
const OUT_IMAGES = path.resolve(process.cwd(), 'public/products');

async function main() {
  await mkdir(OUT_IMAGES, { recursive: true });

  const res = await fetch(MENU_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; blaze-seed/1.0)' },
  });

  if (!res.ok) {
    console.error(`Menu fetch failed: ${res.status} ${res.statusText}`);
    console.error('Fall back to hand-transcribing ~50 products (see plan Step 4).');
    process.exit(1);
  }

  const html = await res.text();

  // The Greenline menu embeds its catalog as JSON in a Next.js data payload.
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    console.error('No __NEXT_DATA__ payload found — the menu is client-rendered.');
    console.error('Fall back to hand-transcribing ~50 products (see plan Step 4).');
    process.exit(1);
  }

  console.log('Payload found. Inspect and map it to the Product shape, then write:');
  console.log(`  ${OUT_JSON}`);
  await writeFile(
    path.resolve(process.cwd(), 'data/raw-menu-payload.json'),
    match[1],
    'utf8',
  );
  console.log('Raw payload written to data/raw-menu-payload.json for mapping.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Populate `data/catalog.json`**

Run `cd blaze && npm run seed`.

**If it succeeds:** map the raw payload into the `Product` shape. Download each product image into `public/products/<slug>.jpg` and set `images: ["/products/<slug>.jpg"]`.

**If it exits non-zero** (the menu is client-rendered and resists scraping — a likely outcome, and not a blocker): open `https://shopblaze.ca/menu/brampton/` in the preview browser, use `get_page_text` to read the rendered menu, and hand-transcribe ~50 real products. Slower, identical result.

Either way, the finished `catalog.json` must satisfy every assertion in `tests/catalog-data.test.ts`:

- 45+ products across all twelve categories: `dried-flower`, `pre-rolls`, `vape`, `infused-pre-rolls`, `concentrates`, `edibles`, `accessories`, `capsules`, `beverages`, `oil`, `topicals`, `seeds`.
- At least one sold-out product (`inStock: false`).
- At least one on-sale product with `salePriceCents < priceCents` and the `on-sale` badge.
- At least one name 45+ characters long.
- At least one product with `images: []`.
- Both `%` and `mg/g` potency units represented.
- Six products carrying the `staff-pick` badge — the landing rail reads these.
- Every image path starts with `/products/`.

Delete `data/raw-menu-payload.json` when mapping is done — it is a scratch file.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd blaze && npm test
```

Expected: PASS — tokens, contract suite, and catalog-data all green. The contract suite now runs against 45+ real products.

- [ ] **Step 6: Commit**

```bash
git add blaze/data blaze/public/products blaze/scripts blaze/tests
git commit -m "feat(blaze): seed catalog with real Brampton products and local images"
```

---

### Task 4: Price and potency formatting

**Files:**
- Create: `blaze/lib/format.ts`
- Create: `blaze/tests/format.test.ts`

**Interfaces:**
- Consumes: `PotencyRange`, `StrainType`, `Product` from Task 2.
- Produces: `formatPrice(cents)`, `formatPotencyRange(range)`, `formatStrainType(type)`, `effectivePriceCents(product)`.

- [ ] **Step 1: Write the failing test**

`blaze/tests/format.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd blaze && npm test -- tests/format.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/format"`

- [ ] **Step 3: Create `blaze/lib/format.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd blaze && npm test -- tests/format.test.ts
```

Expected: PASS — 18 passed

- [ ] **Step 5: Commit**

```bash
git add blaze/lib/format.ts blaze/tests/format.test.ts
git commit -m "feat(blaze): price and potency formatting helpers"
```

---

### Task 5: Filtering, sorting, and search

**Files:**
- Create: `blaze/lib/filters.ts`
- Create: `blaze/tests/filters.test.ts`

**Interfaces:**
- Consumes: `Product`, `StrainType` from Task 2; `effectivePriceCents` from Task 4.
- Produces: `FilterState`, `EMPTY_FILTERS`, `applyFilters(products, filters)`, `SortKey`, `SORT_OPTIONS`, `sortProducts(products, key)`, `toMgPerG(range)`.

- [ ] **Step 1: Write the failing test**

`blaze/tests/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  EMPTY_FILTERS,
  sortProducts,
  toMgPerG,
  type FilterState,
} from '@/lib/filters';
import type { Product } from '@/lib/catalog/types';

function make(overrides: Partial<Product>): Product {
  return {
    id: overrides.slug ?? 'x',
    slug: 'x',
    name: 'Product',
    brand: 'Brand A',
    category: 'pre-rolls',
    strainType: 'hybrid',
    thc: { min: 20, max: 20, unit: '%' },
    cbd: null,
    size: '1 g',
    priceCents: 2000,
    salePriceCents: null,
    inStock: true,
    images: [],
    description: 'd',
    terpenes: [],
    effects: [],
    badges: [],
    addedAt: '2026-01-01',
    ...overrides,
  } as Product;
}

const filters = (over: Partial<FilterState>): FilterState => ({ ...EMPTY_FILTERS, ...over });

describe('toMgPerG', () => {
  it('passes mg/g through unchanged', () => {
    expect(toMgPerG({ min: 100, max: 200, unit: 'mg/g' })).toEqual({ min: 100, max: 200 });
  });

  it('converts percent to mg/g at ten times the value', () => {
    expect(toMgPerG({ min: 18, max: 24, unit: '%' })).toEqual({ min: 180, max: 240 });
  });

  it('returns null for a null range', () => {
    expect(toMgPerG(null)).toBeNull();
  });
});

describe('applyFilters', () => {
  const products = [
    make({ slug: 'a', category: 'pre-rolls', brand: 'Brand A', priceCents: 1000, strainType: 'indica-dominant' }),
    make({ slug: 'b', category: 'vape', brand: 'Brand B', priceCents: 5000, strainType: 'sativa-dominant' }),
    make({ slug: 'c', category: 'vape', brand: 'Brand A', priceCents: 3000, inStock: false }),
  ];

  it('returns everything when no filters are set', () => {
    expect(applyFilters(products, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = applyFilters(products, filters({ categories: ['vape'] }));
    expect(result.map((p) => p.slug)).toEqual(['b', 'c']);
  });

  it('treats multiple categories as OR', () => {
    const result = applyFilters(products, filters({ categories: ['vape', 'pre-rolls'] }));
    expect(result).toHaveLength(3);
  });

  it('filters by brand', () => {
    const result = applyFilters(products, filters({ brands: ['Brand A'] }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'c']);
  });

  it('filters by strain type', () => {
    const result = applyFilters(products, filters({ strainTypes: ['indica-dominant'] }));
    expect(result.map((p) => p.slug)).toEqual(['a']);
  });

  it('treats different filter groups as AND', () => {
    const result = applyFilters(products, filters({ categories: ['vape'], brands: ['Brand A'] }));
    expect(result.map((p) => p.slug)).toEqual(['c']);
  });

  it('filters by minimum price against the effective price', () => {
    const sale = make({ slug: 'd', priceCents: 9000, salePriceCents: 1000 });
    const result = applyFilters([...products, sale], filters({ priceMaxCents: 1500 }));
    expect(result.map((p) => p.slug).sort()).toEqual(['a', 'd']);
  });

  it('filters by price range inclusively', () => {
    const result = applyFilters(products, filters({ priceMinCents: 1000, priceMaxCents: 3000 }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'c']);
  });

  it('compares THC across units by normalising to mg/g', () => {
    const percent = make({ slug: 'pct', thc: { min: 25, max: 25, unit: '%' } });
    const mgg = make({ slug: 'mgg', thc: { min: 100, max: 100, unit: 'mg/g' } });
    const result = applyFilters([percent, mgg], filters({ thcMinMgPerG: 200 }));
    expect(result.map((p) => p.slug)).toEqual(['pct']);
  });

  it('excludes products with no THC data when a THC minimum is set', () => {
    const none = make({ slug: 'none', thc: null });
    const result = applyFilters([none], filters({ thcMinMgPerG: 1 }));
    expect(result).toEqual([]);
  });

  it('hides out-of-stock products when inStockOnly is set', () => {
    const result = applyFilters(products, filters({ inStockOnly: true }));
    expect(result.map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('searches name, brand, and category case-insensitively', () => {
    const named = make({ slug: 'z', name: 'Orange Tingz', brand: 'Pistol' });
    expect(applyFilters([named], filters({ search: 'orange' }))).toHaveLength(1);
    expect(applyFilters([named], filters({ search: 'PISTOL' }))).toHaveLength(1);
    expect(applyFilters([named], filters({ search: 'nope' }))).toHaveLength(0);
  });

  it('ignores surrounding whitespace in the search term', () => {
    const named = make({ slug: 'z', name: 'Orange Tingz' });
    expect(applyFilters([named], filters({ search: '  orange  ' }))).toHaveLength(1);
  });
});

describe('sortProducts', () => {
  const products = [
    make({ slug: 'mid', name: 'B', priceCents: 3000, thc: { min: 10, max: 10, unit: '%' }, addedAt: '2026-02-01' }),
    make({ slug: 'low', name: 'C', priceCents: 1000, thc: { min: 30, max: 30, unit: '%' }, addedAt: '2026-03-01' }),
    make({ slug: 'high', name: 'A', priceCents: 5000, thc: { min: 20, max: 20, unit: '%' }, addedAt: '2026-01-01' }),
  ];

  it('sorts by price ascending', () => {
    expect(sortProducts(products, 'price-asc').map((p) => p.slug)).toEqual(['low', 'mid', 'high']);
  });

  it('sorts by price descending', () => {
    expect(sortProducts(products, 'price-desc').map((p) => p.slug)).toEqual(['high', 'mid', 'low']);
  });

  it('sorts by THC descending, normalised across units', () => {
    expect(sortProducts(products, 'thc-desc').map((p) => p.slug)).toEqual(['low', 'high', 'mid']);
  });

  it('sorts by name ascending', () => {
    expect(sortProducts(products, 'name-asc').map((p) => p.slug)).toEqual(['high', 'mid', 'low']);
  });

  it('sorts by newest first', () => {
    expect(sortProducts(products, 'newest').map((p) => p.slug)).toEqual(['low', 'mid', 'high']);
  });

  it('does not mutate the input array', () => {
    const input = [...products];
    sortProducts(input, 'price-asc');
    expect(input.map((p) => p.slug)).toEqual(['mid', 'low', 'high']);
  });

  it('puts out-of-stock products last under featured sorting', () => {
    const sorted = sortProducts(
      [make({ slug: 'out', inStock: false }), make({ slug: 'in', inStock: true })],
      'featured',
    );
    expect(sorted.map((p) => p.slug)).toEqual(['in', 'out']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd blaze && npm test -- tests/filters.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/filters"`

- [ ] **Step 3: Create `blaze/lib/filters.ts`**

```ts
import type { PotencyRange, Product, StrainType } from './catalog/types';
import { effectivePriceCents } from './format';

export interface FilterState {
  categories: string[];
  brands: string[];
  strainTypes: StrainType[];
  thcMinMgPerG: number | null;
  thcMaxMgPerG: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  inStockOnly: boolean;
  search: string;
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  brands: [],
  strainTypes: [],
  thcMinMgPerG: null,
  thcMaxMgPerG: null,
  priceMinCents: null,
  priceMaxCents: null,
  inStockOnly: false,
  search: '',
};

export function toMgPerG(range: PotencyRange | null): { min: number; max: number } | null {
  if (!range) return null;
  const factor = range.unit === '%' ? 10 : 1;
  return { min: range.min * factor, max: range.max * factor };
}

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  const term = filters.search.trim().toLowerCase();

  return products.filter((product) => {
    if (filters.categories.length && !filters.categories.includes(product.category)) return false;
    if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
    if (
      filters.strainTypes.length &&
      (!product.strainType || !filters.strainTypes.includes(product.strainType))
    ) {
      return false;
    }
    if (filters.inStockOnly && !product.inStock) return false;

    const price = effectivePriceCents(product);
    if (filters.priceMinCents !== null && price < filters.priceMinCents) return false;
    if (filters.priceMaxCents !== null && price > filters.priceMaxCents) return false;

    if (filters.thcMinMgPerG !== null || filters.thcMaxMgPerG !== null) {
      const thc = toMgPerG(product.thc);
      if (!thc) return false;
      if (filters.thcMinMgPerG !== null && thc.max < filters.thcMinMgPerG) return false;
      if (filters.thcMaxMgPerG !== null && thc.min > filters.thcMaxMgPerG) return false;
    }

    if (term) {
      const haystack = `${product.name} ${product.brand} ${product.category}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });
}

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'thc-desc' | 'name-asc' | 'newest';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'thc-desc', label: 'THC: high to low' },
  { key: 'name-asc', label: 'Name: A–Z' },
  { key: 'newest', label: 'Newest' },
];

function thcMax(product: Product): number {
  return toMgPerG(product.thc)?.max ?? -1;
}

export function sortProducts(products: Product[], key: SortKey): Product[] {
  const copy = [...products];

  switch (key) {
    case 'price-asc':
      return copy.sort((a, b) => effectivePriceCents(a) - effectivePriceCents(b));
    case 'price-desc':
      return copy.sort((a, b) => effectivePriceCents(b) - effectivePriceCents(a));
    case 'thc-desc':
      return copy.sort((a, b) => thcMax(b) - thcMax(a));
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
      return copy.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        const aPick = a.badges.includes('staff-pick') ? 0 : 1;
        const bPick = b.badges.includes('staff-pick') ? 0 : 1;
        return aPick - bPick;
      });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd blaze && npm test -- tests/filters.test.ts
```

Expected: PASS — 24 passed

- [ ] **Step 5: Commit**

```bash
git add blaze/lib/filters.ts blaze/tests/filters.test.ts
git commit -m "feat(blaze): catalog filter, sort, and search logic"
```

---

### Task 6: Cart reducer and provider

**Files:**
- Create: `blaze/lib/cart.ts`, `blaze/components/cart/CartProvider.tsx`
- Create: `blaze/tests/cart.test.ts`

**Interfaces:**
- Consumes: `Product` from Task 2; `effectivePriceCents` from Task 4.
- Produces: `CartLine`, `CartAction`, `cartReducer`, `cartSubtotalCents`, `cartCount`, `lineFromProduct`, `CART_STORAGE_KEY`, and the `CartProvider` / `useCart` pair.

- [ ] **Step 1: Write the failing test**

`blaze/tests/cart.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  cartCount,
  cartReducer,
  cartSubtotalCents,
  lineFromProduct,
  type CartLine,
} from '@/lib/cart';
import type { Product } from '@/lib/catalog/types';

const product = {
  id: 'p-1',
  slug: 'orange-tingz',
  name: 'Orange Tingz',
  brand: 'Pistol and Paris',
  priceCents: 2400,
  salePriceCents: null,
  images: ['/products/orange-tingz.jpg'],
} as Product;

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'p-1',
  slug: 'orange-tingz',
  name: 'Orange Tingz',
  brand: 'Pistol and Paris',
  priceCents: 2400,
  image: '/products/orange-tingz.jpg',
  qty: 1,
  ...over,
});

describe('lineFromProduct', () => {
  it('uses the effective price', () => {
    expect(lineFromProduct({ ...product, salePriceCents: 1800 }).priceCents).toBe(1800);
  });

  it('uses the first image, or null when there is none', () => {
    expect(lineFromProduct(product).image).toBe('/products/orange-tingz.jpg');
    expect(lineFromProduct({ ...product, images: [] }).image).toBeNull();
  });
});

describe('cartReducer', () => {
  it('adds a new line with quantity one', () => {
    const state = cartReducer([], { type: 'add', product });
    expect(state).toHaveLength(1);
    expect(state[0].qty).toBe(1);
  });

  it('increments quantity when the same product is added again', () => {
    const state = cartReducer([line()], { type: 'add', product });
    expect(state).toHaveLength(1);
    expect(state[0].qty).toBe(2);
  });

  it('adds a specific quantity when given', () => {
    const state = cartReducer([], { type: 'add', product, qty: 3 });
    expect(state[0].qty).toBe(3);
  });

  it('removes a line', () => {
    expect(cartReducer([line()], { type: 'remove', productId: 'p-1' })).toEqual([]);
  });

  it('ignores removal of a product that is not in the cart', () => {
    const state = [line()];
    expect(cartReducer(state, { type: 'remove', productId: 'nope' })).toEqual(state);
  });

  it('sets an explicit quantity', () => {
    const state = cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: 5 });
    expect(state[0].qty).toBe(5);
  });

  it('removes the line when quantity is set to zero', () => {
    expect(cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: 0 })).toEqual([]);
  });

  it('removes the line when quantity is set below zero', () => {
    expect(cartReducer([line()], { type: 'setQty', productId: 'p-1', qty: -2 })).toEqual([]);
  });

  it('clears every line', () => {
    expect(cartReducer([line(), line({ productId: 'p-2' })], { type: 'clear' })).toEqual([]);
  });

  it('replaces state on hydrate', () => {
    const restored = [line({ qty: 4 })];
    expect(cartReducer([], { type: 'hydrate', lines: restored })).toEqual(restored);
  });

  it('does not mutate the previous state', () => {
    const state = [line()];
    cartReducer(state, { type: 'add', product });
    expect(state[0].qty).toBe(1);
  });
});

describe('cart selectors', () => {
  it('sums the subtotal across lines and quantities', () => {
    const lines = [line({ qty: 2 }), line({ productId: 'p-2', priceCents: 1000, qty: 3 })];
    expect(cartSubtotalCents(lines)).toBe(2400 * 2 + 1000 * 3);
  });

  it('returns zero for an empty cart', () => {
    expect(cartSubtotalCents([])).toBe(0);
  });

  it('counts total items, not distinct lines', () => {
    expect(cartCount([line({ qty: 2 }), line({ productId: 'p-2', qty: 3 })])).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd blaze && npm test -- tests/cart.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/cart"`

- [ ] **Step 3: Create `blaze/lib/cart.ts`**

```ts
import type { Product } from './catalog/types';
import { effectivePriceCents } from './format';

export const CART_STORAGE_KEY = 'blaze.cart.v1';

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string | null;
  qty: number;
}

export type CartAction =
  | { type: 'add'; product: Product; qty?: number }
  | { type: 'remove'; productId: string }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] };

export function lineFromProduct(product: Product, qty = 1): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    priceCents: effectivePriceCents(product),
    image: product.images[0] ?? null,
    qty,
  };
}

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const qty = action.qty ?? 1;
      // A non-positive add is meaningless, and must never leave a zero- or
      // negative-quantity line behind. Removal is setQty's job, not add's.
      if (qty <= 0) return state;
      const existing = state.find((l) => l.productId === action.product.id);
      if (existing) {
        return state.map((l) =>
          l.productId === action.product.id ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...state, lineFromProduct(action.product, qty)];
    }
    case 'remove':
      return state.filter((l) => l.productId !== action.productId);
    case 'setQty':
      if (action.qty <= 0) return state.filter((l) => l.productId !== action.productId);
      return state.map((l) => (l.productId === action.productId ? { ...l, qty: action.qty } : l));
    case 'clear':
      return [];
    case 'hydrate':
      return action.lines;
    default:
      return state;
  }
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd blaze && npm test -- tests/cart.test.ts
```

Expected: PASS — 16 passed

- [ ] **Step 5: Create `blaze/components/cart/CartProvider.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import {
  cartCount,
  cartReducer,
  cartSubtotalCents,
  CART_STORAGE_KEY,
  type CartLine,
} from '@/lib/cart';
import type { Product } from '@/lib/catalog/types';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) dispatch({ type: 'hydrate', lines: JSON.parse(raw) as CartLine[] });
    } catch {
      // Corrupt or unavailable storage starts an empty cart rather than crashing.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, [lines, hydrated]);

  const value: CartContextValue = {
    lines,
    count: cartCount(lines),
    subtotalCents: cartSubtotalCents(lines),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    add: (product, qty) => {
      dispatch({ type: 'add', product, qty });
      setIsOpen(true);
    },
    remove: (productId) => dispatch({ type: 'remove', productId }),
    setQty: (productId, qty) => dispatch({ type: 'setQty', productId, qty }),
    clear: () => dispatch({ type: 'clear' }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside a CartProvider');
  return ctx;
}
```

- [ ] **Step 6: Commit**

```bash
git add blaze/lib/cart.ts blaze/components/cart blaze/tests/cart.test.ts
git commit -m "feat(blaze): cart reducer, selectors, and persisted provider"
```

---

### Task 7: Motion primitives

**Files:**
- Create: `blaze/lib/motion/useReducedMotion.ts`, `blaze/lib/motion/useInViewPaused.ts`, `blaze/lib/motion/usePointerParallax.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useReducedMotion(): boolean`, `useInViewPaused(ref): boolean`, `usePointerParallax(ref, options): void`.

These are DOM-behaviour hooks whose value is proven visually in Task 14, not by unit tests. Writing jsdom tests for `IntersectionObserver` and `matchMedia` shims would test the shims, not the behaviour.

- [ ] **Step 1: Create `blaze/lib/motion/useReducedMotion.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// The server cannot know the client's OS setting, so it renders the motion-enabled
// state. Returning false here keeps the server and client markup identical; the
// client snapshot then corrects it during hydration rather than after an effect
// has already allowed a painted frame of motion.
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: Create `blaze/lib/motion/useInViewPaused.ts`**

```ts
'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * True when the element is off-screen or the tab is hidden. Ambient loops read
 * this so a backgrounded page stops burning battery.
 */
export function useInViewPaused(ref: RefObject<Element>): boolean {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let onScreen = true;
    const sync = () => setPaused(!onScreen || document.hidden);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: '100px' },
    );

    observer.observe(element);
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref]);

  return paused;
}
```

- [ ] **Step 3: Create `blaze/lib/motion/usePointerParallax.ts`**

```ts
'use client';

import { useEffect, type RefObject } from 'react';

interface Options {
  /** Skip entirely — pass the result of useReducedMotion(). */
  disabled?: boolean;
}

/**
 * Writes --px and --py (each roughly -1..1) onto the container as the pointer
 * moves across it. Layers multiply these by their own depth in CSS, so the
 * whole effect costs one rAF and two custom properties.
 *
 * Pointer-only by design: touch devices have no hover position, and the hero
 * gives them a scroll-linked drift instead.
 */
export function usePointerParallax(ref: RefObject<HTMLElement>, options: Options = {}): void {
  const { disabled = false } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const write = () => {
      frame = 0;
      element.style.setProperty('--px', px.toFixed(3));
      element.style.setProperty('--py', py.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(write);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(write);
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);

    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      // Leave no stale offset behind: a disabled or unmounted parallax must let
      // its layers settle back to neutral, not freeze at the last pointer position.
      element.style.removeProperty('--px');
      element.style.removeProperty('--py');
    };
  }, [ref, disabled]);
}
```

- [ ] **Step 4: Verify it type-checks**

```bash
cd blaze && npx tsc --noEmit
```

Expected: no output (exit 0)

- [ ] **Step 5: Commit**

```bash
git add blaze/lib/motion
git commit -m "feat(blaze): reduced-motion, off-screen pause, and pointer parallax hooks"
```

---

### Task 8: Site shell — header, footer, and layout wiring

**Files:**
- Create: `blaze/components/shell/SiteHeader.tsx`, `blaze/components/shell/SiteHeader.module.css`
- Create: `blaze/components/shell/SiteFooter.tsx`, `blaze/components/shell/SiteFooter.module.css`
- Create: `blaze/components/cart/CartButton.tsx`
- Modify: `blaze/app/layout.tsx`

**Interfaces:**
- Consumes: `useCart` from Task 6.
- Produces: `<SiteHeader />`, `<SiteFooter />`, `<CartButton />`; layout now wraps children in `CartProvider`.

- [ ] **Step 1: Create `blaze/components/cart/CartButton.tsx`**

```tsx
'use client';

import { useCart } from './CartProvider';

export function CartButton({ className }: { className?: string }) {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      className={className}
      onClick={open}
      aria-label={count === 1 ? 'Open cart, 1 item' : `Open cart, ${count} items`}
    >
      Cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
```

- [ ] **Step 2: Create `blaze/components/shell/SiteHeader.module.css`**

```css
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--header-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.inner {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;
}

.logo {
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 20px;
  color: #E7E2D4;
  font-family: var(--font-ui);
}

.location {
  font-size: 12px;
  color: var(--text-muted);
  border-left: 1px solid var(--border);
  padding-left: 16px;
}

.spacer { flex: 1; }

.search {
  width: 240px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  padding: 9px 14px;
  font-size: 13px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.search::placeholder { color: var(--text-muted); }
.search:focus { border-color: var(--gold-dim); }

.cart {
  background: var(--accent);
  color: #04150E;
  border: 0;
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.cart:hover { background: var(--accent-press); }

@media (max-width: 720px) {
  .location { display: none; }
  .search { width: 100%; }
  .inner { gap: 10px; }
  .logo { font-size: 17px; }
}
```

- [ ] **Step 3: Create `blaze/components/shell/SiteHeader.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { CartButton } from '@/components/cart/CartButton';
import styles from './SiteHeader.module.css';

interface Props {
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function SiteHeader({ search, onSearchChange }: Props) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>BLAZE</Link>
        <span className={styles.location}>Brampton · Pickup</span>
        <span className={styles.spacer} />
        {onSearchChange && (
          <input
            className={styles.search}
            type="search"
            value={search ?? ''}
            placeholder="Search the menu"
            aria-label="Search the menu"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}
        <CartButton className={styles.cart} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create `blaze/components/shell/SiteFooter.module.css` and `SiteFooter.tsx`**

`SiteFooter.module.css`:

```css
.footer {
  border-top: 1px solid var(--border);
  margin-top: 80px;
  padding: 40px 0 56px;
  color: var(--text-muted);
  font-size: 13px;
}

.row { display: flex; flex-wrap: wrap; gap: 24px; align-items: baseline; }
.brand { font-weight: 900; letter-spacing: 0.08em; color: #E7E2D4; font-size: 16px; }
.spacer { flex: 1; }
.legal { max-width: 520px; line-height: 1.6; }
```

`SiteFooter.tsx`:

```tsx
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.row}`}>
        <span className={styles.brand}>BLAZE</span>
        <span className={styles.spacer} />
        <p className={styles.legal}>
          Must be 19+ with valid government-issued ID to purchase. Please consume responsibly.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Wire `blaze/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { CartProvider } from '@/components/cart/CartProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blaze Cannabis — Brampton',
  description: 'Browse the Blaze Cannabis Brampton menu and reserve for pickup.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify in the browser**

`preview_start` `{name: "blaze"}`, then `read_page`. Expected: header renders with BLAZE wordmark in off-white, a Cart button in emerald. Confirm no console errors with `read_console_messages`.

- [ ] **Step 7: Commit**

```bash
git add blaze/components blaze/app/layout.tsx
git commit -m "feat(blaze): site header, footer, and cart provider wiring"
```

---

### Task 9: Age gate

**Files:**
- Create: `blaze/components/shell/AgeGate.tsx`, `blaze/components/shell/AgeGate.module.css`
- Create: `blaze/lib/age-gate.ts`
- Create: `blaze/tests/age-gate.test.ts`
- Modify: `blaze/app/layout.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `AGE_STORAGE_KEY`, `readAgeVerified()`, `writeAgeVerified()`, `<AgeGate />`.

- [ ] **Step 1: Write the failing test**

`blaze/tests/age-gate.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { AGE_STORAGE_KEY, readAgeVerified, writeAgeVerified } from '@/lib/age-gate';

describe('age gate persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('reports unverified on a first visit', () => {
    expect(readAgeVerified()).toBe(false);
  });

  it('reports verified after writing', () => {
    writeAgeVerified();
    expect(readAgeVerified()).toBe(true);
  });

  it('writes the documented storage key', () => {
    writeAgeVerified();
    expect(window.localStorage.getItem(AGE_STORAGE_KEY)).toBe('true');
  });

  it('treats any other stored value as unverified', () => {
    window.localStorage.setItem(AGE_STORAGE_KEY, 'maybe');
    expect(readAgeVerified()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd blaze && npm test -- tests/age-gate.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/age-gate"`

- [ ] **Step 3: Create `blaze/lib/age-gate.ts`**

```ts
export const AGE_STORAGE_KEY = 'blaze.age-verified.v1';

export function readAgeVerified(): boolean {
  try {
    return window.localStorage.getItem(AGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeAgeVerified(): void {
  try {
    window.localStorage.setItem(AGE_STORAGE_KEY, 'true');
  } catch {
    // Storage blocked — the gate simply reappears next visit.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd blaze && npm test -- tests/age-gate.test.ts
```

Expected: PASS — 4 passed

- [ ] **Step 5: Create `blaze/components/shell/AgeGate.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: radial-gradient(80% 80% at 50% 40%, #0C1016 0%, #050608 100%);
}

.panel {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 32px 28px;
  text-align: center;
  animation: rise var(--dur-slow) var(--ease-out) both;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand {
  font-weight: 900;
  letter-spacing: 0.1em;
  font-size: 22px;
  color: #E7E2D4;
  margin-bottom: 18px;
}

.title { font-size: 24px; margin: 14px 0 8px; }
.copy { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
.actions { display: grid; gap: 10px; }

.confirm {
  background: var(--accent);
  color: #04150E;
  border: 0;
  border-radius: 999px;
  padding: 13px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.confirm:hover { background: var(--accent-press); }

.deny {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 13px 20px;
  font-size: 14px;
  cursor: pointer;
}

.denied { color: var(--danger); font-size: 14px; margin: 0; }
```

- [ ] **Step 6: Create `blaze/components/shell/AgeGate.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { readAgeVerified, writeAgeVerified } from '@/lib/age-gate';
import styles from './AgeGate.module.css';

export function AgeGate() {
  const [status, setStatus] = useState<'checking' | 'blocked' | 'denied' | 'allowed'>('checking');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deniedRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setStatus(readAgeVerified() ? 'allowed' : 'blocked');
  }, []);

  useEffect(() => {
    if (status === 'blocked') confirmRef.current?.focus();
    if (status === 'denied') deniedRef.current?.focus();
    document.body.style.overflow = status === 'blocked' || status === 'denied' ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  useEffect(() => {
    const content = document.getElementById('site-content');
    if (!content) return;

    // aria-modal is only a hint to assistive tech. `inert` is what actually stops
    // Tab and the screen-reader cursor from reaching the store behind the gate.
    const blocking = status === 'blocked' || status === 'denied';
    if (blocking) content.setAttribute('inert', '');
    else content.removeAttribute('inert');

    return () => content.removeAttribute('inert');
  }, [status]);

  if (status === 'checking' || status === 'allowed') return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className={styles.panel}>
        <div className={styles.brand}>BLAZE</div>
        <div className="hairline" />
        {status === 'denied' ? (
          <>
            <h2 id="age-gate-title" className={styles.title} ref={deniedRef} tabIndex={-1}>
              Come back another time
            </h2>
            <p className={styles.denied}>You must be 19 or older to view this site.</p>
          </>
        ) : (
          <>
            <h2 id="age-gate-title" className={styles.title}>Are you 19 or older?</h2>
            <p className={styles.copy}>
              You must be of legal age to enter. Valid government-issued ID is required at pickup.
            </p>
            <div className={styles.actions}>
              <button
                ref={confirmRef}
                type="button"
                className={styles.confirm}
                onClick={() => { writeAgeVerified(); setStatus('allowed'); }}
              >
                Yes, I am 19+
              </button>
              <button type="button" className={styles.deny} onClick={() => setStatus('denied')}>
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Mount it in `blaze/app/layout.tsx`**

Add the import, wrap the page content in an identifiable element so the gate can mark it `inert`, and add a no-JS fallback — without it, a visitor with JavaScript disabled never sees the gate at all, because `status` stays `'checking'` forever.

```tsx
import { AgeGate } from '@/components/shell/AgeGate';
```

```tsx
      <body>
        <CartProvider>
          <noscript>
            <style>{`#site-content { display: none !important; }`}</style>
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <h1>You must be 19 or older to view this site.</h1>
              <p>Please enable JavaScript to continue.</p>
            </div>
          </noscript>
          <AgeGate />
          <div id="site-content">{children}</div>
        </CartProvider>
      </body>
```

- [ ] **Step 8: Verify in the browser**

Reload the preview. Expected: the gate covers the page on first load; clicking "Yes, I am 19+" dismisses it, and a reload does not bring it back. Clear localStorage via `javascript_tool` (`localStorage.clear()`) and reload to confirm it returns.

- [ ] **Step 9: Commit**

```bash
git add blaze/lib/age-gate.ts blaze/components/shell/AgeGate.tsx blaze/components/shell/AgeGate.module.css blaze/tests/age-gate.test.ts blaze/app/layout.tsx
git commit -m "feat(blaze): 19+ age gate with local persistence"
```

---

### Task 10: Product card, grid, and empty state

**Files:**
- Create: `blaze/components/menu/ProductCard.tsx`, `blaze/components/menu/ProductCard.module.css`
- Create: `blaze/components/menu/ProductGrid.tsx`, `blaze/components/menu/ProductGrid.module.css`
- Create: `blaze/components/menu/EmptyState.tsx`

**Interfaces:**
- Consumes: `Product` (Task 2); `formatPrice`, `formatPotencyRange`, `formatStrainType` (Task 4); `useCart` (Task 6).
- Produces: `<ProductCard product />`, `<ProductGrid products />`, `<EmptyState onClear />`.

- [ ] **Step 1: Create `blaze/components/menu/ProductCard.module.css`**

```css
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.card:hover { border-color: var(--gold-dim); transform: translateY(-2px); }

/* Dim the photo, not the text. Fading the whole card pushed --text-muted to
   roughly 2.2:1 against the surface, well under the 4.5:1 AA minimum. */
.card[data-out-of-stock='true'] .media { opacity: 0.4; }
.card[data-out-of-stock='true'] .name { color: var(--text-muted); }

.media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: linear-gradient(160deg, var(--surface-2), var(--surface));
  display: grid;
  place-items: center;
}

.mediaLink {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.image { object-fit: contain; padding: 12%; }

.fallback {
  font-family: var(--font-display);
  font-size: 44px;
  color: var(--border-strong);
}

.badges { position: absolute; top: 10px; left: 10px; display: flex; gap: 6px; flex-wrap: wrap; }

.badge {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 999px;
  font-weight: 700;
  background: var(--spot-yellow);
  color: #14120A;
}

.strain {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.13);
  color: var(--accent);
}

.body { padding: 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.potency { font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em; }
.brand { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
.name { font-family: var(--font-ui); font-size: 14px; font-weight: 600; line-height: 1.35; margin: 2px 0; }
.size { font-size: 11px; color: var(--text-muted); }
.footer { display: flex; align-items: center; gap: 10px; margin-top: auto; padding-top: 10px; }
.price { font-size: 16px; font-weight: 800; color: var(--gold); }
.was { font-size: 12px; color: var(--text-muted); text-decoration: line-through; }

.add {
  margin-left: auto;
  background: var(--accent);
  color: #04150E;
  border: 0;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.add:hover { background: var(--accent-press); }
.add:disabled { background: var(--border-strong); color: var(--text-muted); cursor: not-allowed; }
```

- [ ] **Step 2: Create `blaze/components/menu/ProductCard.tsx`**

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import type { Product } from '@/lib/catalog/types';
import { formatPotencyRange, formatPrice, formatStrainType } from '@/lib/format';
import styles from './ProductCard.module.css';

const BADGE_LABELS: Record<string, string> = {
  'new-drop': 'New Drop',
  'on-sale': 'Sale',
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const image = product.images[0] ?? null;
  const potency = formatPotencyRange(product.thc);
  const spotBadges = product.badges.filter((b) => b === 'new-drop' || b === 'on-sale');

  return (
    <article className={styles.card} data-out-of-stock={!product.inStock}>
      {/* The media link is decorative: the product-name link below is the real,
          labelled link to the same place. An aria-label here would also override
          name computation from the badges, hiding "Sale" from assistive tech. */}
      <div className={styles.media}>
        <Link
          href={`/product/${product.slug}`}
          className={styles.mediaLink}
          aria-hidden="true"
          tabIndex={-1}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 25vw"
              className={styles.image}
            />
          ) : (
            <span className={styles.fallback}>{product.brand.charAt(0)}</span>
          )}
        </Link>
        {spotBadges.length > 0 && (
          <div className={styles.badges}>
            {spotBadges.map((badge) => (
              <span key={badge} className={styles.badge}>{BADGE_LABELS[badge]}</span>
            ))}
          </div>
        )}
        {product.strainType && (
          <span className={styles.strain}>{formatStrainType(product.strainType)}</span>
        )}
      </div>

      <div className={styles.body}>
        {potency && <span className={styles.potency}>THC {potency}</span>}
        <span className={styles.brand}>{product.brand}</span>
        <Link href={`/product/${product.slug}`} className={styles.name}>{product.name}</Link>
        <span className={styles.size}>{product.size}</span>

        <div className={styles.footer}>
          <span className={styles.price}>
            {product.salePriceCents !== null && <span className="sr-only">Sale price </span>}
            {formatPrice(product.salePriceCents ?? product.priceCents)}
          </span>
          {product.salePriceCents !== null && (
            <del className={styles.was}>
              <span className="sr-only">Regular price </span>
              {formatPrice(product.priceCents)}
            </del>
          )}
          <button
            type="button"
            className={styles.add}
            disabled={!product.inStock}
            onClick={() => add(product)}
          >
            {product.inStock ? 'Add' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create `blaze/components/menu/ProductGrid.module.css` and `ProductGrid.tsx`**

`ProductGrid.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 1080px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
```

`ProductGrid.tsx`:

```tsx
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `blaze/components/menu/EmptyState.tsx`**

```tsx
export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 20px' }}>
      <p className="kicker">Nothing on the shelf</p>
      <h3 style={{ fontSize: 24, margin: '10px 0 8px' }}>No products match those filters</h3>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Try widening the price or THC range, or clear everything and start again.
      </p>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'transparent',
          color: 'var(--text)',
          border: '1px solid var(--border-strong)',
          borderRadius: 999,
          padding: '11px 22px',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Clear all filters
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Verify it type-checks**

```bash
cd blaze && npx tsc --noEmit
```

Expected: no output (exit 0)

- [ ] **Step 6: Commit**

```bash
git add blaze/components/menu
git commit -m "feat(blaze): product card, responsive grid, and empty state"
```

---

### Task 11: Menu page

**Files:**
- Create: `blaze/components/menu/CategoryChips.tsx`, `blaze/components/menu/CategoryChips.module.css`
- Create: `blaze/components/menu/SortSelect.tsx`
- Create: `blaze/components/menu/FilterPanel.tsx`, `blaze/components/menu/FilterPanel.module.css`
- Create: `blaze/components/menu/MenuBrowser.tsx`, `blaze/components/menu/MenuBrowser.module.css`
- Create: `blaze/app/menu/brampton/page.tsx`

**Interfaces:**
- Consumes: `getCatalogSource` (Task 2); `applyFilters`, `sortProducts`, `EMPTY_FILTERS`, `SORT_OPTIONS`, `FilterState`, `SortKey` (Task 5); `ProductGrid`, `EmptyState` (Task 10); `SiteHeader`, `SiteFooter` (Task 8).
- Produces: `<MenuBrowser products categories />` and the `/menu/brampton` route.

- [ ] **Step 1: Create `blaze/components/menu/CategoryChips.module.css` and `CategoryChips.tsx`**

`CategoryChips.module.css`:

```css
.row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 12px;
  scrollbar-width: none;
}

.row::-webkit-scrollbar { display: none; }

.chip {
  flex: none;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-fast) var(--ease-out);
}

.chip:hover { color: var(--text); border-color: var(--border-strong); }
.chip[aria-pressed='true'] {
  background: var(--accent);
  border-color: var(--accent);
  color: #04150E;
  font-weight: 700;
}
```

`CategoryChips.tsx`:

```tsx
'use client';

import type { Category } from '@/lib/catalog/types';
import styles from './CategoryChips.module.css';

interface Props {
  categories: Category[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
}

export function CategoryChips({ categories, selected, onToggle, onClear }: Props) {
  return (
    <div className={styles.row} role="group" aria-label="Product categories">
      <button
        type="button"
        className={styles.chip}
        aria-pressed={selected.length === 0}
        onClick={onClear}
      >
        All products
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className={styles.chip}
          aria-pressed={selected.includes(category.slug)}
          onClick={() => onToggle(category.slug)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `blaze/components/menu/SortSelect.tsx`**

```tsx
'use client';

import { SORT_OPTIONS, type SortKey } from '@/lib/filters';

interface Props {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortSelect({ value, onChange }: Props) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
      Sort
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '8px 14px',
          fontSize: 13,
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Create `blaze/components/menu/FilterPanel.module.css`**

```css
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  align-self: start;
  position: sticky;
  top: 84px;
}

.group { margin-bottom: 20px; }
.group:last-of-type { margin-bottom: 0; }

.legend {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 10px;
}

.option {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--text-muted);
  padding: 5px 0;
  cursor: pointer;
}

.option input { accent-color: var(--accent); }
.option:hover { color: var(--text); }

.range { display: flex; gap: 8px; }

.range input {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 10px;
  font-size: 13px;
}

.close { display: none; }

@media (max-width: 900px) {
  .panel {
    position: fixed;
    inset: 0;
    z-index: 60;
    border-radius: 0;
    overflow-y: auto;
    padding: 20px;
  }
  .panel[data-open='false'] { display: none; }
  .close {
    display: block;
    width: 100%;
    margin-top: 24px;
    background: var(--accent);
    color: #04150E;
    border: 0;
    border-radius: 999px;
    padding: 13px;
    font-weight: 700;
    cursor: pointer;
  }
}
```

- [ ] **Step 4: Create `blaze/components/menu/FilterPanel.tsx`**

```tsx
'use client';

import type { Category, StrainType } from '@/lib/catalog/types';
import type { FilterState } from '@/lib/filters';
import styles from './FilterPanel.module.css';

const STRAINS: { value: StrainType; label: string }[] = [
  { value: 'indica-dominant', label: 'Indica Dominant' },
  { value: 'sativa-dominant', label: 'Sativa Dominant' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cbd', label: 'CBD' },
];

interface Props {
  categories: Category[];
  brands: string[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({ categories, brands, filters, onChange, isOpen, onClose }: Props) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const dollarsToCents = (raw: string): number | null => {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100);
  };

  return (
    <aside className={styles.panel} data-open={isOpen} aria-label="Filters">
      <div className={styles.group}>
        <p className={styles.legend}>Category</p>
        {categories.map((category) => (
          <label key={category.slug} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.categories.includes(category.slug)}
              onChange={() => onChange({ ...filters, categories: toggle(filters.categories, category.slug) })}
            />
            {category.name}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Strain type</p>
        {STRAINS.map((strain) => (
          <label key={strain.value} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.strainTypes.includes(strain.value)}
              onChange={() => onChange({ ...filters, strainTypes: toggle(filters.strainTypes, strain.value) })}
            />
            {strain.label}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Brand</p>
        {brands.map((brand) => (
          <label key={brand} className={styles.option}>
            <input
              type="checkbox"
              checked={filters.brands.includes(brand)}
              onChange={() => onChange({ ...filters, brands: toggle(filters.brands, brand) })}
            />
            {brand}
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Price ($)</p>
        <div className={styles.range}>
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Minimum price in dollars"
            value={filters.priceMinCents === null ? '' : filters.priceMinCents / 100}
            onChange={(e) => onChange({ ...filters, priceMinCents: dollarsToCents(e.target.value) })}
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Maximum price in dollars"
            value={filters.priceMaxCents === null ? '' : filters.priceMaxCents / 100}
            onChange={(e) => onChange({ ...filters, priceMaxCents: dollarsToCents(e.target.value) })}
          />
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>THC (mg/g)</p>
        <div className={styles.range}>
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Minimum THC in milligrams per gram"
            value={filters.thcMinMgPerG ?? ''}
            onChange={(e) =>
              onChange({ ...filters, thcMinMgPerG: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Maximum THC in milligrams per gram"
            value={filters.thcMaxMgPerG ?? ''}
            onChange={(e) =>
              onChange({ ...filters, thcMaxMgPerG: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
          />
          In stock only
        </label>
      </div>

      <button type="button" className={styles.close} onClick={onClose}>Show results</button>
    </aside>
  );
}
```

- [ ] **Step 5: Create `blaze/components/menu/MenuBrowser.module.css`**

```css
.layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 28px; align-items: start; }
.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.count { font-size: 13px; color: var(--text-muted); margin-left: auto; }
.filterToggle { display: none; }

@media (max-width: 900px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .filterToggle {
    display: inline-block;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
  }
  .count { width: 100%; margin-left: 0; }
}
```

- [ ] **Step 6: Create `blaze/components/menu/MenuBrowser.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { SiteHeader } from '@/components/shell/SiteHeader';
import type { Category, Product } from '@/lib/catalog/types';
import { applyFilters, EMPTY_FILTERS, sortProducts, type FilterState, type SortKey } from '@/lib/filters';
import { CategoryChips } from './CategoryChips';
import { EmptyState } from './EmptyState';
import { FilterPanel } from './FilterPanel';
import { ProductGrid } from './ProductGrid';
import { SortSelect } from './SortSelect';
import styles from './MenuBrowser.module.css';

interface Props {
  products: Product[];
  categories: Category[];
}

export function MenuBrowser({ products, categories }: Props) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const visible = useMemo(
    () => sortProducts(applyFilters(products, filters), sort),
    [products, filters, sort],
  );

  const toggleCategory = (slug: string) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));

  return (
    <>
      <SiteHeader
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      />

      <main className="container" style={{ paddingTop: 28 }}>
        <p className="kicker">Pickup at Blaze Cannabis — Brampton</p>
        <h1 style={{ fontSize: 34, margin: '10px 0 18px' }}>The menu</h1>

        <CategoryChips
          categories={categories}
          selected={filters.categories}
          onToggle={toggleCategory}
          onClear={() => setFilters((f) => ({ ...f, categories: [] }))}
        />

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
          </button>
          <SortSelect value={sort} onChange={setSort} />
          <span className={styles.count}>
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className={styles.layout}>
          <FilterPanel
            categories={categories}
            brands={brands}
            filters={filters}
            onChange={setFilters}
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />
          {visible.length > 0 ? (
            <ProductGrid products={visible} />
          ) : (
            <EmptyState onClear={() => setFilters(EMPTY_FILTERS)} />
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 7: Create `blaze/app/menu/brampton/page.tsx`**

```tsx
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { getCatalogSource } from '@/lib/catalog';

export const metadata = {
  title: 'Menu — Blaze Cannabis Brampton',
};

export default async function MenuPage() {
  const source = getCatalogSource();
  const [products, categories] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
  ]);

  return (
    <>
      <MenuBrowser products={products} categories={categories} />
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 8: Verify in the browser**

Navigate the preview to `http://localhost:3000/menu/brampton`. Confirm with `read_page` and a screenshot:

- The grid shows 45+ products.
- Clicking a category chip narrows the grid and the count updates.
- Changing sort to "Price: low to high" reorders the grid.
- Typing in the header search narrows the grid live.
- Setting an impossible price range (min 9999) shows the empty state; "Clear all filters" restores the grid.

Check `read_console_messages` for errors.

- [ ] **Step 9: Verify both widths**

`resize_window` to `{width: 390, height: 844}`: grid is 2 columns, chips scroll horizontally, a "Filters" button appears and opens a full-screen panel that closes via "Show results".

`resize_window` to `{preset: "desktop"}`: grid is 4 columns with a sticky sidebar.

- [ ] **Step 10: Commit**

```bash
git add blaze/components/menu blaze/app/menu
git commit -m "feat(blaze): menu page with live filtering, sorting, and search"
```

---

### Task 12: Product detail page and themed 404

**Files:**
- Create: `blaze/components/product/QuantityStepper.tsx`
- Create: `blaze/components/product/ProductDetail.tsx`, `blaze/components/product/ProductDetail.module.css`
- Create: `blaze/components/product/BrandRail.tsx`, `blaze/components/product/BrandRail.module.css`
- Create: `blaze/app/product/[slug]/page.tsx`, `blaze/app/not-found.tsx`

**Interfaces:**
- Consumes: `getCatalogSource` (Task 2); formatting helpers (Task 4); `useCart` (Task 6); `SiteHeader`/`SiteFooter` (Task 8); `ProductCard` (Task 10).
- Produces: the `/product/[slug]` route and a themed 404.

- [ ] **Step 1: Create `blaze/components/product/QuantityStepper.tsx`**

```tsx
'use client';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

const buttonStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  width: 34,
  height: 34,
  fontSize: 16,
  cursor: 'pointer',
};

export function QuantityStepper({ value, onChange, min = 1, max = 99 }: Props) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        style={buttonStyle}
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontSize: 15 }}>{value}</span>
      <button
        type="button"
        style={buttonStyle}
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `blaze/components/product/ProductDetail.module.css`**

```css
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; padding-top: 32px; }

.media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: radial-gradient(70% 70% at 50% 40%, var(--surface-2), var(--surface));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.image { object-fit: contain; padding: 10%; }
.fallback { font-family: var(--font-display); font-size: 96px; color: var(--border-strong); }
.brand { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }
.name { font-size: 36px; margin: 8px 0 14px; line-height: 1.1; }
.meta { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }

.tag {
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.tagAccent { background: rgba(52, 211, 153, 0.13); border-color: transparent; color: var(--accent); }
.priceRow { display: flex; align-items: baseline; gap: 12px; margin-bottom: 22px; }
.price { font-size: 30px; font-weight: 800; color: var(--gold); }
.was { font-size: 16px; color: var(--text-muted); text-decoration: line-through; }
.actions { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; flex-wrap: wrap; }

.add {
  background: var(--accent);
  color: #04150E;
  border: 0;
  border-radius: 999px;
  padding: 13px 28px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.add:hover { background: var(--accent-press); }
.add:disabled { background: var(--border-strong); color: var(--text-muted); cursor: not-allowed; }
.description { color: var(--text-muted); line-height: 1.7; font-size: 15px; }
.sectionLabel { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin: 26px 0 10px; }

@media (max-width: 900px) {
  .layout { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .name { font-size: 26px; }
  .price { font-size: 24px; }
}
```

- [ ] **Step 3: Create `blaze/components/product/ProductDetail.tsx`**

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import type { Product } from '@/lib/catalog/types';
import { formatPotencyRange, formatPrice, formatStrainType } from '@/lib/format';
import { QuantityStepper } from './QuantityStepper';
import styles from './ProductDetail.module.css';

export function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const image = product.images[0] ?? null;
  const thc = formatPotencyRange(product.thc);
  const cbd = formatPotencyRange(product.cbd);

  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.media}>
        {image ? (
          <Image src={image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.image} priority />
        ) : (
          <span className={styles.fallback} aria-hidden="true">{product.brand.charAt(0)}</span>
        )}
      </div>

      <div>
        <p className={styles.brand}>{product.brand}</p>
        <h1 className={styles.name}>{product.name}</h1>

        <div className={styles.meta}>
          {product.strainType && (
            <span className={`${styles.tag} ${styles.tagAccent}`}>{formatStrainType(product.strainType)}</span>
          )}
          {thc && <span className={styles.tag}>THC {thc}</span>}
          {cbd && <span className={styles.tag}>CBD {cbd}</span>}
          <span className={styles.tag}>{product.size}</span>
        </div>

        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.salePriceCents ?? product.priceCents)}</span>
          {product.salePriceCents !== null && (
            <span className={styles.was}>{formatPrice(product.priceCents)}</span>
          )}
        </div>

        <div className={styles.actions}>
          <QuantityStepper value={qty} onChange={setQty} />
          <button
            type="button"
            className={styles.add}
            disabled={!product.inStock}
            onClick={() => add(product, qty)}
          >
            {product.inStock ? 'Add to cart' : 'Sold out'}
          </button>
        </div>

        <p className={styles.description}>{product.description}</p>

        {product.terpenes.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Terpenes</p>
            <div className={styles.meta}>
              {product.terpenes.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          </>
        )}

        {product.effects.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Reported effects</p>
            <div className={styles.meta}>
              {product.effects.map((e) => <span key={e} className={styles.tag}>{e}</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `blaze/components/product/BrandRail.module.css` and `BrandRail.tsx`**

`BrandRail.module.css`:

```css
.section { margin-top: 72px; }
.head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 18px; }
.title { font-size: 24px; margin: 0; }
.rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }

@media (max-width: 1080px) { .rail { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) { .rail { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
```

`BrandRail.tsx`:

```tsx
import { ProductCard } from '@/components/menu/ProductCard';
import type { Product } from '@/lib/catalog/types';
import styles from './BrandRail.module.css';

interface Props {
  brand: string;
  products: Product[];
}

export function BrandRail({ brand, products }: Props) {
  if (products.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>More from {brand}</h2>
      </div>
      <div className={styles.rail}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `blaze/app/product/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { BrandRail } from '@/components/product/BrandRail';
import { ProductDetail } from '@/components/product/ProductDetail';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export async function generateStaticParams() {
  const products = await getCatalogSource().listProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getCatalogSource().getProduct(params.slug);
  return { title: product ? `${product.name} — Blaze Cannabis` : 'Not found — Blaze Cannabis' };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const source = getCatalogSource();
  const product = await source.getProduct(params.slug);
  if (!product) notFound();

  const all = await source.listProducts();
  const related = all
    .filter((p) => p.brand === product.brand && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main>
        <ProductDetail product={product} />
        <BrandRail brand={product.brand} products={related} />
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 6: Create `blaze/app/not-found.tsx`**

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ padding: '140px 20px', textAlign: 'center' }}>
      <p className="kicker">404</p>
      <h1 style={{ fontSize: 40, margin: '12px 0 10px' }}>Off the shelf</h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 26px' }}>
        That product is not on the Brampton menu.
      </p>
      <Link
        href="/menu/brampton"
        style={{
          display: 'inline-block',
          background: 'var(--accent)',
          color: '#04150E',
          borderRadius: 999,
          padding: '13px 26px',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        Back to the menu
      </Link>
    </main>
  );
}
```

- [ ] **Step 7: Verify in the browser**

Click a product from the menu. Confirm: detail renders, quantity stepper increments and decrements, "Add to cart" opens the drawer once Task 13 lands (for now it updates the header count), and the brand rail shows other products from the same brand.

Navigate to `/product/not-a-real-product`. Expected: the themed 404, not the Next.js default.

- [ ] **Step 8: Verify both widths**

390px: single column, image above details. 1440px: two columns.

- [ ] **Step 9: Commit**

```bash
git add blaze/components/product blaze/app/product blaze/app/not-found.tsx
git commit -m "feat(blaze): product detail page, brand rail, and themed 404"
```

---

### Task 13: Cart drawer

**Files:**
- Create: `blaze/components/cart/CartDrawer.tsx`, `blaze/components/cart/CartDrawer.module.css`
- Modify: `blaze/app/layout.tsx`

**Interfaces:**
- Consumes: `useCart` (Task 6); `formatPrice` (Task 4).
- Produces: `<CartDrawer />`, mounted globally.

- [ ] **Step 1: Create `blaze/components/cart/CartDrawer.module.css`**

```css
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(4, 5, 8, 0.66);
  backdrop-filter: blur(3px);
  animation: fade var(--dur) var(--ease-out) both;
}

@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

.panel {
  position: fixed;
  z-index: 90;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  background: var(--bg);
  border-left: 1px solid var(--border-strong);
  display: flex;
  flex-direction: column;
  animation: slideIn var(--dur) var(--ease-out) both;
}

@keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.head { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid var(--border); }
.title { font-size: 20px; margin: 0; }

.close {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  border-radius: 999px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 15px;
}

.lines { flex: 1; overflow-y: auto; padding: 12px 20px; }
.line { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }

.thumb {
  width: 56px;
  height: 68px;
  flex: none;
  border-radius: var(--radius-sm);
  background: linear-gradient(160deg, var(--surface-2), var(--surface));
  object-fit: contain;
}

.lineName { font-size: 14px; font-weight: 600; margin: 0 0 2px; }
.lineBrand { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin: 0 0 8px; }
.qtyRow { display: flex; align-items: center; gap: 8px; }

.qtyBtn {
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  color: var(--text);
  border-radius: 6px;
  width: 26px;
  height: 26px;
  cursor: pointer;
}

.linePrice { margin-left: auto; font-weight: 700; color: var(--gold); font-size: 14px; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 20px; font-size: 14px; }
.foot { padding: 20px; border-top: 1px solid var(--border); }
.subtotal { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 15px; }
.subtotalValue { font-size: 22px; font-weight: 800; color: var(--gold); }
.note { color: var(--text-muted); font-size: 12px; margin: 0 0 16px; }

.reserve {
  width: 100%;
  background: var(--accent);
  color: #04150E;
  border: 0;
  border-radius: 999px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.reserve:disabled { background: var(--border-strong); color: var(--text-muted); cursor: not-allowed; }
.confirmed { text-align: center; padding: 40px 20px; }

@media (max-width: 720px) {
  .panel {
    top: auto;
    left: 0;
    width: 100%;
    height: 82vh;
    border-left: 0;
    border-top: 1px solid var(--border-strong);
    border-radius: 16px 16px 0 0;
    animation: slideUp var(--dur) var(--ease-out) both;
  }
  @keyframes slideUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
}
```

- [ ] **Step 2: Create `blaze/components/cart/CartDrawer.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useCart } from './CartProvider';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const { lines, subtotalCents, isOpen, close, setQty, remove, clear } = useCart();
  const [reserved, setReserved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  useEffect(() => { if (!isOpen) setReserved(false); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="Cart">
        <div className={styles.head}>
          <h2 className={styles.title}>{reserved ? 'Reserved' : 'Your cart'}</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close cart">×</button>
        </div>

        {reserved ? (
          <div className={styles.confirmed}>
            <p className="kicker">Ready for pickup</p>
            <h3 style={{ fontSize: 22, margin: '10px 0 10px' }}>We&apos;ll hold it for you</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              Bring valid government-issued ID to the Brampton store. Payment is completed in person.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.lines}>
              {lines.length === 0 ? (
                <p className={styles.empty}>Your cart is empty.</p>
              ) : (
                lines.map((line) => (
                  <div key={line.productId} className={styles.line}>
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt="" className={styles.thumb} />
                    ) : (
                      <span className={styles.thumb} aria-hidden="true" />
                    )}
                    <div style={{ flex: 1 }}>
                      <p className={styles.lineBrand}>{line.brand}</p>
                      <p className={styles.lineName}>{line.name}</p>
                      <div className={styles.qtyRow}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          aria-label={`Decrease quantity of ${line.name}`}
                          onClick={() => setQty(line.productId, line.qty - 1)}
                        >
                          −
                        </button>
                        <span style={{ fontSize: 13, minWidth: 18, textAlign: 'center' }}>{line.qty}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          aria-label={`Increase quantity of ${line.name}`}
                          onClick={() => setQty(line.productId, line.qty + 1)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          style={{ marginLeft: 4 }}
                          aria-label={`Remove ${line.name}`}
                          onClick={() => remove(line.productId)}
                        >
                          ×
                        </button>
                        <span className={styles.linePrice}>{formatPrice(line.priceCents * line.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.foot}>
              <div className={styles.subtotal}>
                <span>Subtotal</span>
                <span className={styles.subtotalValue}>{formatPrice(subtotalCents)}</span>
              </div>
              <p className={styles.note}>Taxes calculated in store. Payment on pickup.</p>
              <button
                type="button"
                className={styles.reserve}
                disabled={lines.length === 0}
                onClick={() => { setReserved(true); clear(); }}
              >
                Reserve for pickup
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Mount it in `blaze/app/layout.tsx`**

Add the import and render it after `{children}`, inside `CartProvider`:

```tsx
import { CartDrawer } from '@/components/cart/CartDrawer';
```

```tsx
        <CartProvider>
          <AgeGate />
          {children}
          <CartDrawer />
        </CartProvider>
```

- [ ] **Step 4: Verify in the browser**

Add a product from the menu. Expected: the drawer slides in from the right; quantity steppers update the subtotal; the remove button drops the line; "Reserve for pickup" swaps to the confirmation state; Escape and the backdrop both close it. Reload the page with items in the cart and confirm they persist.

- [ ] **Step 5: Verify both widths**

390px: the drawer is a bottom sheet at 82vh with rounded top corners. 1440px: a right-side drawer at 420px.

- [ ] **Step 6: Commit**

```bash
git add blaze/components/cart blaze/app/layout.tsx
git commit -m "feat(blaze): cart drawer with pickup reservation state"
```

---

### Task 14: Living catalogue hero

The signature piece. Three product layers drift on independent loops, motes rise through a shaft of light, and on pointer devices the layers respond to cursor position.

**Files:**
- Create: `blaze/components/landing/LivingCatalogueHero.tsx`, `blaze/components/landing/LivingCatalogueHero.module.css`

**Interfaces:**
- Consumes: `Product` (Task 2); `useReducedMotion`, `useInViewPaused`, `usePointerParallax` (Task 7).
- Produces: `<LivingCatalogueHero products />` — expects 3 products; renders the first 2 on narrow viewports.

- [ ] **Step 1: Create `blaze/components/landing/LivingCatalogueHero.module.css`**

```css
.hero {
  position: relative;
  min-height: 88vh;
  display: grid;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(160deg, #0B0E14 0%, var(--bg) 62%);
  --px: 0;
  --py: 0;
}

.shaft {
  position: absolute;
  top: -30%;
  bottom: -30%;
  left: 18%;
  width: 34%;
  background: linear-gradient(180deg, rgba(200, 183, 138, 0.13), transparent 76%);
  transform: skewX(-16deg);
  filter: blur(8px);
  animation: shaft 11s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 1;
}

/* Smoke sits behind the product layers so they read as emerging from it.
   Soft radial plumes rather than a video: no asset to ship, and only
   transform animates. blur() is the one expensive property here, so it is
   reduced on mobile and dropped entirely under reduced-motion. */
/* Stacking is explicit rather than relying on auto: a positioned element with a
   positive z-index paints after positioned siblings at auto, whatever the DOM
   order — so smoke at z-index 1 would cover the shaft and the products. */
.smoke {
  position: absolute;
  inset: -25%;
  z-index: 0;
  pointer-events: none;
  background-repeat: no-repeat;
  filter: blur(22px);
  will-change: transform;
}

.smokeA {
  opacity: 0.5;
  background-image:
    radial-gradient(closest-side, rgba(206, 214, 230, 0.20), transparent 72%),
    radial-gradient(closest-side, rgba(178, 188, 208, 0.15), transparent 72%);
  background-size: 58% 62%, 44% 48%;
  background-position: 28% 62%, 64% 38%;
  animation: smokeA 26s ease-in-out infinite alternate;
}

.smokeB {
  opacity: 0.34;
  background-image:
    radial-gradient(closest-side, rgba(214, 220, 236, 0.16), transparent 70%),
    radial-gradient(closest-side, rgba(190, 198, 218, 0.12), transparent 70%);
  background-size: 48% 52%, 38% 42%;
  background-position: 74% 66%, 44% 24%;
  animation: smokeB 34s ease-in-out infinite alternate;
}

/* Different durations and travel so the two layers never visibly resync. */
@keyframes smokeA {
  from { transform: translate3d(-3%, 2%, 0) scale(1); }
  to { transform: translate3d(4%, -3%, 0) scale(1.12); }
}

@keyframes smokeB {
  from { transform: translate3d(3%, -2%, 0) scale(1.08); }
  to { transform: translate3d(-4%, 3%, 0) scale(1); }
}

@keyframes shaft {
  from { opacity: 0.45; transform: skewX(-16deg) translateX(-7%); }
  to { opacity: 1; transform: skewX(-16deg) translateX(9%); }
}

.mote {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--gold);
  opacity: 0;
  pointer-events: none;
  animation: mote linear infinite;
}

@keyframes mote {
  0% { transform: translateY(0); opacity: 0; }
  12% { opacity: 0.8; }
  86% { opacity: 0.4; }
  100% { transform: translateY(-88vh); opacity: 0; }
}

.stage { position: absolute; inset: 0; pointer-events: none; z-index: 2; }

/* Two elements, because one cannot carry two independent transforms. The outer
   owns the pointer parallax; the inner owns the float. Animating margin-top on a
   single element would avoid the collision but forces a layout pass every frame
   on three simultaneous elements — the most expensive thing on this page. */
.layer {
  position: absolute;
  transform: translate3d(calc(var(--px) * var(--depth) * 1px), calc(var(--py) * var(--depth) * 1px), 0);
  transition: transform 400ms var(--ease-out);
}

.layerInner {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(200, 183, 138, 0.16);
  background: linear-gradient(160deg, #232937, #12151D);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.55);
  animation: float var(--float-dur) ease-in-out infinite alternate;
  animation-delay: var(--float-delay, 0s);
}

@keyframes float {
  from { transform: translateY(-10px); }
  to { transform: translateY(12px); }
}

.layerInner img { width: 100%; height: 100%; object-fit: contain; padding: 12%; }

/* Durations ride as custom properties because those inherit to .layerInner;
   animation-duration set on the parent would not. */
.l1 { width: 190px; height: 240px; left: 54%; top: 20%; --depth: 26; --float-dur: 7s; --float-delay: 0s; }
.l2 { width: 132px; height: 168px; left: 74%; top: 48%; --depth: 16; --float-dur: 9s; --float-delay: -2s; }
.l3 { width: 104px; height: 132px; left: 63%; top: 70%; --depth: 38; --float-dur: 6s; --float-delay: -4s; }

.copy { position: relative; z-index: 5; padding: 80px 0; max-width: 620px; }
.rule { width: 120px; margin-bottom: 18px; }
.h1 { font-size: clamp(38px, 6vw, 68px); line-height: 1.02; margin: 14px 0 18px; }
.lede { color: var(--text-muted); font-size: 17px; line-height: 1.65; margin: 0 0 30px; max-width: 46ch; }

.cta {
  display: inline-block;
  background: var(--accent);
  color: #04150E;
  border-radius: 999px;
  padding: 15px 32px;
  font-size: 15px;
  font-weight: 700;
  transition: background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.cta:hover { background: var(--accent-press); transform: translateY(-1px); }
.hero[data-paused='true'] .shaft,
.hero[data-paused='true'] .mote,
.hero[data-paused='true'] .smoke,
.hero[data-paused='true'] .layerInner { animation-play-state: paused; }

@media (max-width: 900px) {
  .hero { min-height: 78vh; }
  .l1 { width: 132px; height: 168px; left: 58%; top: 12%; }
  .l2 { width: 96px; height: 122px; left: 76%; top: 40%; }
  .l3 { display: none; }
  .shaft { left: 40%; width: 46%; }
  .copy { padding: 120px 0 60px; }
  .lede { font-size: 15px; }
  /* Blur is the most expensive thing on this page. Halve it on mobile and
     drop the second plume — one layer still reads as smoke. */
  .smoke { filter: blur(12px); }
  .smokeB { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .shaft, .mote, .smoke, .layerInner { animation: none; }
  .mote { opacity: 0.35; }
  .layer { transition: none; }
}
```

- [ ] **Step 2: Create `blaze/components/landing/LivingCatalogueHero.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useInViewPaused } from '@/lib/motion/useInViewPaused';
import { usePointerParallax } from '@/lib/motion/usePointerParallax';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import type { Product } from '@/lib/catalog/types';
import styles from './LivingCatalogueHero.module.css';

const MOTES = [
  { left: '26%', duration: '7s', delay: '0s' },
  { left: '39%', duration: '9s', delay: '1.6s' },
  { left: '52%', duration: '8s', delay: '3.1s' },
  { left: '68%', duration: '10s', delay: '0.8s' },
  { left: '81%', duration: '7.5s', delay: '4.2s' },
  { left: '33%', duration: '11s', delay: '5.4s' },
];

const LAYER_CLASSES = [styles.l1, styles.l2, styles.l3];

export function LivingCatalogueHero({ products }: { products: Product[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const paused = useInViewPaused(heroRef);
  usePointerParallax(heroRef, { disabled: reduced });

  return (
    <section ref={heroRef} className={styles.hero} data-paused={paused}>
      <div className={`${styles.smoke} ${styles.smokeA}`} aria-hidden="true" />
      <div className={`${styles.smoke} ${styles.smokeB}`} aria-hidden="true" />
      <div className={styles.shaft} aria-hidden="true" />

      <div className={styles.stage} aria-hidden="true">
        {MOTES.map((mote, index) => (
          <span
            key={index}
            className={styles.mote}
            style={{
              left: mote.left,
              bottom: '-4%',
              animationDuration: mote.duration,
              animationDelay: mote.delay,
            }}
          />
        ))}

        {products.slice(0, 3).map((product, index) => (
          <div key={product.id} className={`${styles.layer} ${LAYER_CLASSES[index]}`}>
            <div className={styles.layerInner}>
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" loading="eager" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`container ${styles.copy}`}>
        <div className={`hairline ${styles.rule}`} />
        <p className="kicker">Now open · Brampton</p>
        <h1 className={styles.h1}>Curated, not stocked.</h1>
        <p className={styles.lede}>
          Every shelf is picked by our budtenders. Browse the Brampton menu, reserve what you
          want, and collect it in store.
        </p>
        <Link href="/menu/brampton" className={styles.cta}>Browse the menu</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire it into `blaze/app/page.tsx` temporarily to verify**

```tsx
import { LivingCatalogueHero } from '@/components/landing/LivingCatalogueHero';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export default async function LandingPage() {
  const products = await getCatalogSource().listProducts();
  const featured = products.filter((p) => p.images.length > 0).slice(0, 3);

  return (
    <>
      <SiteHeader />
      <LivingCatalogueHero products={featured} />
    </>
  );
}
```

- [ ] **Step 4: Verify the motion in the browser**

Navigate the preview to `http://localhost:3000`. Confirm:

- Two smoke plumes drift behind everything at different rates, so the loop never visibly resyncs. Confirm both are animating and that the products read as sitting *in* the smoke, not on top of a flat wash — check `getComputedStyle` on `.smokeA` and `.smokeB` returns different `animationDuration` values (26s and 34s).
- Three product layers visibly drift at different rates.
- Motes rise through the light shaft.
- Moving the pointer across the hero shifts the layers by different amounts (deeper layers move more).
- `read_console_messages` shows no errors.

**Also confirm the hero's ref is attached unconditionally.** `useInViewPaused` captures `ref.current` once, on mount, and its dependency array is `[ref]` — a `useRef` object whose identity never changes. So if the element were behind a conditional render, the effect would find `null`, create no `IntersectionObserver`, and silently never pause the ambient loops. The `<section ref={heroRef}>` in this task is rendered unconditionally, which is what makes that safe. Verify via `javascript_tool` that the observer is actually doing its job:

```js
document.querySelector('[class*="hero"]')?.dataset.paused
```

Expected: `"false"` while the hero is on screen. Scroll past it and re-read; expected `"true"`.

- [ ] **Step 5: Verify reduced motion is honoured**

The browser tooling cannot emulate `prefers-reduced-motion`, so verify the rule statically rather than faking a browser assertion.

Confirm by reading `LivingCatalogueHero.module.css` that the file ends with a `@media (prefers-reduced-motion: reduce)` block setting `animation: none` on `.shaft`, `.mote`, and `.layer`, and `transition: none` on `.layer`.

Then confirm the animations are live in the normal case, via `javascript_tool`:

```js
getComputedStyle(document.querySelector('[class*="shaft"]')).animationName
```

Expected: a hashed name containing `shaft`, not `"none"`. That proves the animation is wired; the media block proves it is disabled when asked.

- [ ] **Step 6: Verify both widths**

390px: two layers only (the third is hidden), copy has top padding so it clears the header, no horizontal scroll. Confirm no overflow:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Expected: `true`

1440px: three layers, headline at full size.

- [ ] **Step 7: Commit**

```bash
git add blaze/components/landing blaze/app/page.tsx
git commit -m "feat(blaze): living catalogue hero with parallax layers and rising motes"
```

---

### Task 15: Landing page composition

**Files:**
- Create: `blaze/components/landing/Reveal.tsx`, `blaze/components/landing/Reveal.module.css`
- Create: `blaze/components/landing/CategoryQuickGrid.tsx`, `blaze/components/landing/CategoryQuickGrid.module.css`
- Create: `blaze/components/landing/BudtenderRail.tsx`, `blaze/components/landing/BudtenderRail.module.css`
- Create: `blaze/components/landing/StoreBlock.tsx`, `blaze/components/landing/StoreBlock.module.css`
- Modify: `blaze/app/page.tsx`

**Interfaces:**
- Consumes: `getCatalogSource` (Task 2); `ProductCard` (Task 10); `LivingCatalogueHero` (Task 14); `SiteHeader`/`SiteFooter` (Task 8).
- Produces: the finished landing page.

- [ ] **Step 1: Create `blaze/components/landing/Reveal.module.css` and `Reveal.tsx`**

`Reveal.module.css`:

```css
.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}

.reveal[data-visible='true'] { opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

`Reveal.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.css';

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Without this branch, a browser lacking IntersectionObserver leaves every
    // section below the hero at opacity 0 — a blank page, not a missing effect.
    // Do NOT "improve" this with a setTimeout fallback: the page server-renders
    // every section at once, so a timer reveals the whole page while the visitor
    // is still reading the hero, and the scroll reveal never happens.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.reveal} data-visible={visible} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `blaze/components/landing/CategoryQuickGrid.module.css` and `CategoryQuickGrid.tsx`**

`CategoryQuickGrid.module.css`:

```css
.section { padding: 96px 0 0; }
.head { margin-bottom: 26px; }
.title { font-size: 30px; margin: 10px 0 0; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }

.tile {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 26px 22px;
  min-height: 132px;
  transition: border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.tile:hover { border-color: var(--gold-dim); transform: translateY(-3px); }
.tileName { font-family: var(--font-display); font-size: 20px; margin: 0 0 6px; }
.tileBlurb { color: var(--text-muted); font-size: 13px; line-height: 1.5; margin: 0; }

@media (max-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
@media (max-width: 480px) { .tile { padding: 20px 18px; min-height: 110px; } }
```

`CategoryQuickGrid.tsx`:

```tsx
import Link from 'next/link';
import type { Category } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './CategoryQuickGrid.module.css';

const FEATURED = ['dried-flower', 'pre-rolls', 'vape', 'edibles', 'concentrates', 'accessories'];

export function CategoryQuickGrid({ categories }: { categories: Category[] }) {
  const shown = FEATURED
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is Category => Boolean(c));

  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.head}>
          <p className="kicker">Shop by category</p>
          <h2 className={styles.title}>Find your shelf</h2>
        </div>
      </Reveal>

      <div className={styles.grid}>
        {shown.map((category, index) => (
          <Reveal key={category.slug} delay={index * 60}>
            <Link href="/menu/brampton" className={styles.tile}>
              <h3 className={styles.tileName}>{category.name}</h3>
              <p className={styles.tileBlurb}>{category.blurb}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `blaze/components/landing/BudtenderRail.module.css` and `BudtenderRail.tsx`**

`BudtenderRail.module.css`:

```css
.section { padding: 96px 0 0; }
.head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
.title { font-size: 30px; margin: 10px 0 0; }
.link { margin-left: auto; color: var(--accent); font-size: 14px; font-weight: 600; }
.rail { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }

@media (max-width: 1180px) { .rail { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) { .rail { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
```

`BudtenderRail.tsx`:

```tsx
import Link from 'next/link';
import { ProductCard } from '@/components/menu/ProductCard';
import type { Product } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './BudtenderRail.module.css';

export function BudtenderRail({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.head}>
          <div>
            <p className="kicker">Recommended by our staff</p>
            <h2 className={styles.title}>Budtender Selects</h2>
          </div>
          <Link href="/menu/brampton" className={styles.link}>View all →</Link>
        </div>
      </Reveal>

      <div className={styles.rail}>
        {products.map((product, index) => (
          <Reveal key={product.id} delay={index * 50}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `blaze/components/landing/StoreBlock.module.css` and `StoreBlock.tsx`**

`StoreBlock.module.css`:

```css
.section { padding: 96px 0 0; }

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 32px;
}

.name { font-size: 26px; margin: 10px 0 12px; }
.address { color: var(--text-muted); font-size: 15px; line-height: 1.7; margin: 0 0 6px; }
.phone { color: var(--accent); font-size: 15px; }
.hoursTitle { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin: 0 0 12px; }
.hourRow { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.hourDay { color: var(--text-muted); }

@media (max-width: 900px) {
  .panel { grid-template-columns: minmax(0, 1fr); padding: 26px; gap: 24px; }
  .name { font-size: 22px; }
}
```

`StoreBlock.tsx`:

```tsx
import type { Store } from '@/lib/catalog/types';
import { Reveal } from './Reveal';
import styles from './StoreBlock.module.css';

export function StoreBlock({ store }: { store: Store }) {
  return (
    <section className={`container ${styles.section}`}>
      <Reveal>
        <div className={styles.panel}>
          <div>
            <p className="kicker">Pickup location</p>
            <h2 className={styles.name}>{store.name}</h2>
            <p className={styles.address}>
              {store.address}
              <br />
              {store.city}, {store.province} {store.postalCode}
            </p>
            <a href={`tel:${store.phone.replace(/[^0-9+]/g, '')}`} className={styles.phone}>
              {store.phone}
            </a>
          </div>

          <div>
            <p className={styles.hoursTitle}>Hours</p>
            {store.hours.map((entry) => (
              <div key={entry.day} className={styles.hourRow}>
                <span className={styles.hourDay}>{entry.day}</span>
                <span>{entry.open} – {entry.close}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 5: Finish `blaze/app/page.tsx`**

```tsx
import { BudtenderRail } from '@/components/landing/BudtenderRail';
import { CategoryQuickGrid } from '@/components/landing/CategoryQuickGrid';
import { LivingCatalogueHero } from '@/components/landing/LivingCatalogueHero';
import { StoreBlock } from '@/components/landing/StoreBlock';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export default async function LandingPage() {
  const source = getCatalogSource();
  const [products, categories, store] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
    source.getStore('brampton'),
  ]);

  const heroProducts = products.filter((p) => p.images.length > 0).slice(0, 3);
  const picks = products.filter((p) => p.badges.includes('staff-pick')).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main>
        <LivingCatalogueHero products={heroProducts} />
        <CategoryQuickGrid categories={categories} />
        <BudtenderRail products={picks} />
        {store && <StoreBlock store={store} />}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Load `http://localhost:3000`. Confirm: hero animates, sections fade and rise as they scroll into view, the Budtender rail shows 6 staff-pick products, the store block shows the Brampton address and hours, and "Browse the menu" navigates to the menu.

- [ ] **Step 7: Commit**

```bash
git add blaze/components/landing blaze/app/page.tsx
git commit -m "feat(blaze): landing page composition with scroll reveals"
```

---

### Task 16: Responsive and accessibility verification, Netlify config

**Files:**
- Create: `blaze/netlify.toml`
- Create: `blaze/README.md`
- Modify: any file where verification finds a defect.

**Interfaces:**
- Consumes: everything.
- Produces: deploy configuration and recorded proof that both widths work.

- [ ] **Step 1: Run the full test suite**

```bash
cd blaze && npm test
```

Expected: PASS — every suite from Tasks 1–9 green. Record the count.

- [ ] **Step 2: Type-check and production build**

```bash
cd blaze && npx tsc --noEmit && npm run build
```

Expected: build completes, listing `/`, `/menu/brampton`, `/product/[slug]`, and `/_not-found`.

- [ ] **Step 3: Verify mobile at 390×844**

`resize_window` `{width: 390, height: 844}`, then walk every surface: landing, menu, product detail, cart drawer, age gate.

For each, assert no horizontal overflow:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Expected: `true` on every page. Fix any page where it is `false` before continuing.

Then assert the responsive contract programmatically, per `javascript_tool`:

```js
getComputedStyle(document.querySelector('[class*="grid"]')).gridTemplateColumns.split(' ').length
```

Expected on the menu at 390px: `2`. Record the measured value for each surface.

- [ ] **Step 4: Verify desktop at 1440px**

`resize_window` `{preset: "desktop"}` and repeat the walk, including the same overflow and column-count assertions.

Expected column count on the menu: `4`. Expected on the Budtender rail: `6`.

- [ ] **Step 5: Verify keyboard navigation**

Tab through the menu page. Confirm every chip, the sort select, all filter inputs, product links, and the cart button take focus with a visible emerald focus ring. Open the cart and confirm Escape closes it.

- [ ] **Step 6: Verify reduced motion coverage statically**

The tooling cannot emulate `prefers-reduced-motion`, so audit the rules instead. Confirm every file that defines an ambient animation or scroll reveal also carries a `prefers-reduced-motion: reduce` block, or is covered by the global rule in `app/globals.css`:

```bash
cd blaze && grep -rl "animation" --include="*.css" . | sort
cd blaze && grep -rl "prefers-reduced-motion" --include="*.css" . | sort
```

Expected: `globals.css`, `LivingCatalogueHero.module.css`, and `Reveal.module.css` all appear in the second list. Any file in the first list but not the second must either be covered by the global rule or gain its own block.

- [ ] **Step 7: Create `blaze/netlify.toml`**

```toml
[build]
  base = "blaze"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

- [ ] **Step 8: Create `blaze/README.md`**

```markdown
# Blaze Cannabis — Storefront Redesign

Pitch build recreating the Blaze Cannabis Brampton storefront with the Nocturne
dark theme and an animated landing hero.

Spec: `docs/superpowers/specs/2026-08-04-blaze-cannabis-redesign-design.md`

## Running

    npm install
    npm run dev      # http://localhost:3000
    npm test
    npm run build

## Data

All product data lives in `data/catalog.json`, seeded once from the live Brampton
menu. Images are local, under `public/products/`. **Nothing fetches at runtime** —
the demo must not depend on a third-party API.

`scripts/seed-catalog.ts` (`npm run seed`) is a one-time development helper. It is
deliberately not part of the build.

## Swapping in the live Greenline POS

Every catalog read goes through `CatalogSource` (`lib/catalog/source.ts`). To go
live:

1. Implement `CatalogSource` against the Greenline external API in
   `lib/catalog/greenline-source.ts`. The token, company name, company ID, and
   location ID come from the retailer's Greenline dashboard, Integrations tab.
2. Keep the token server-side. Read it from `process.env`, never `NEXT_PUBLIC_*`.
3. Point `getCatalogSource()` in `lib/catalog/index.ts` at the new implementation.
4. Add `runCatalogSourceContract('GreenlineCatalogSource', factory, { knownStoreId })`
   to a test file, passing the Greenline location id as `knownStoreId`. The suite
   in `tests/catalog-source.contract.ts` is the acceptance bar.

No component changes are required.
```

- [ ] **Step 9: Commit**

```bash
git add blaze/netlify.toml blaze/README.md
git commit -m "chore(blaze): Netlify config and project README"
```

- [ ] **Step 10: Report results**

Report the test count, the build result, and a table of the measured values from Steps 3–4: for each of the five surfaces at both widths, the overflow check result and the grid column count. Screenshots are not obtainable in this environment — say so plainly rather than omitting it.

Then give the human the exact command to view it themselves, since final aesthetic judgement is theirs:

```bash
cd blaze && npm run dev
```

Note the two open items still needing client sign-off: **logo decolouring** and **cut-out product photography**.

---

## Plan Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Nocturne palette, exact tokens | 1 |
| Motion tokens and reduced-motion rule | 1, 7, 14, 15, 16 |
| `CatalogSource` interface, async methods | 2 |
| Contract suite reusable by the Greenline adapter | 2, 16 (README) |
| ~50 products, 12 categories, edge cases | 3 |
| Seed script, not run at build, with fallback | 3 |
| Local images only | 3 |
| Price and potency formatting, both units | 4 |
| Filter, sort, search client-side | 5, 11 |
| Cart context over localStorage | 6 |
| Landing surface with living-catalogue hero | 14, 15 |
| Menu surface | 11 |
| Product detail surface | 12 |
| Cart drawer surface | 13 |
| Age gate surface, 19+ | 9 |
| Responsive contract, 390px and 1440px | 11, 12, 13, 14, 16 |
| Grid 4/3/2 columns, never 1 | 10 |
| Chips scroll on mobile | 11 |
| Filters sidebar → sheet | 11 |
| Cart drawer → bottom sheet | 13 |
| Hero drops to 2 layers on mobile | 14 |
| Off-screen and hidden-tab pause | 7, 14 |
| Missing image fallback | 10, 12 |
| Empty filter result state | 10, 11 |
| Themed 404 | 12 |
| Keyboard navigation, focus rings | 1, 16 |
| No health/lifestyle claims in copy | 8, 9, 13 (copy reviewed at each) |
| Netlify deploy | 16 |
| `--spot-yellow` on badges only | 10 |

No gaps.

**Placeholder scan:** no TBD, TODO, or "handle edge cases" instructions. Task 3 Step 4 is the only step whose exact output cannot be written in advance — the product data depends on what the live menu returns — so it is specified by the assertions the result must satisfy, and both the scrape path and the hand-transcription fallback are given.

**Type consistency:** `FilterState` uses `thcMinMgPerG`/`thcMaxMgPerG` in Tasks 5 and 11. `effectivePriceCents` is defined in Task 4 and consumed in Tasks 5, 6, 10, 12. `CartLine` fields match between Tasks 6 and 13. `lineFromProduct` is defined in Task 6 and used only there. `useInViewPaused` returns `paused` (true when hidden) and Task 14 binds it to `data-paused`. `getStore` returns `Store | null` in Tasks 2, 15 — Task 15 guards with `{store && ...}`.
