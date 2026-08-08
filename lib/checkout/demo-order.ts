/**
 * Generates an order reference for the mock-mode checkout confirmation only. This
 * is NOT a real order id — mock mode never talks to a server, so nothing exists
 * anywhere for this string to look up. It exists purely so the demo confirmation
 * screen has something concrete to display, the way a real order confirmation
 * would.
 *
 * `now`/`random` are injectable (defaulting to Date.now/Math.random) so this stays
 * a pure, deterministic function under test rather than something that has to be
 * asserted on with a regex and a shrug.
 */

// Excludes visually-ambiguous characters (0/O, 1/I) so a shopper reading this off
// a screen to someone else at pickup doesn't stumble over which letter is which.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 5;

export function generateDemoOrderReference(
  now: () => number = Date.now,
  random: () => number = Math.random,
): string {
  const datePart = new Date(now()).toISOString().slice(2, 10).replace(/-/g, '');
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    const index = Math.floor(random() * REFERENCE_ALPHABET.length);
    suffix += REFERENCE_ALPHABET[index];
  }
  return `DEMO-${datePart}-${suffix}`;
}
