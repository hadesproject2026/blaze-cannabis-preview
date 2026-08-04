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
