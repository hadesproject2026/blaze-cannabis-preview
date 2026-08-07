export const AUTH_STORAGE_KEY = 'blaze.admin.v1';

export type Role = 'owner' | 'shopper';

export interface AuthSession {
  role: Role;
  username: string;
}

interface DemoAccount extends AuthSession {
  password: string;
  /** Human-readable role label shown on the sign-in screen's demo hint. */
  label: string;
}

// Intentionally plain. This is a pitch-demo sign-in, not a real login — see the
// notice rendered on the sign-in screen itself (SignInScreen.tsx). Two fixed
// demo accounts, one per role, so the client can hand out a single link with
// both logins printed right on the screen.
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'owner', username: 'adminblaze', password: 'blaze123', label: 'Shop owner' },
  { role: 'shopper', username: 'userblaze', password: 'blaze123', label: 'Shopper' },
];

/**
 * Pure credential check for the demo sign-in. The username is matched
 * case-insensitively and trimmed; the password must match exactly (not
 * trimmed, case-sensitive). Role is resolved from whichever account's
 * username matched — never from whichever account the password happens to
 * belong to — so a correct password can never grant the wrong role.
 *
 * Returns the resolved session on success, or `null` on any failure. Callers
 * should show one generic failure message rather than say which field, if
 * any, was wrong.
 */
export function verifyCredentials(username: string, password: string): AuthSession | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.username === normalizedUsername);
  if (!account || password !== account.password) return null;
  return { role: account.role, username: account.username };
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
    if (
      parsed &&
      (parsed.role === 'owner' || parsed.role === 'shopper') &&
      typeof parsed.username === 'string'
    ) {
      return { role: parsed.role, username: parsed.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked — the session simply doesn't persist across reloads.
  }
}

export function clearAuthSession(): void {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage was already unavailable.
  }
}
