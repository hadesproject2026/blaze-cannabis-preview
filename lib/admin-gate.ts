export const ADMIN_STORAGE_KEY = 'blaze.admin.v1';

// Intentionally plain. This is a pitch-demo gate, not a real login — see the
// notice rendered on the gate screen itself (AdminGate.tsx).
//
// The `.demo` suffix on the email form is deliberate: `.demo` is not a real
// top-level domain, so that address can never belong to an actual mailbox and
// can never be confused with the client's real email.
export const ADMIN_IDENTITIES = ['owner@blaze.demo', 'owner'] as const;
export const ADMIN_PASSCODE = 'blaze';

/**
 * Pure credential check for the demo gate. Identity is accepted
 * case-insensitively and trimmed; the passcode must match exactly.
 * Both a wrong identity and a wrong passcode return `false` — callers
 * should show one generic failure message rather than say which was wrong.
 */
export function verifyAdminCredentials(identity: string, passcode: string): boolean {
  const normalizedIdentity = identity.trim().toLowerCase();
  const identityKnown = (ADMIN_IDENTITIES as readonly string[]).includes(normalizedIdentity);
  return identityKnown && passcode === ADMIN_PASSCODE;
}

export function readAdminUnlocked(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeAdminUnlocked(): void {
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
  } catch {
    // Storage blocked — the gate simply reappears next visit.
  }
}
