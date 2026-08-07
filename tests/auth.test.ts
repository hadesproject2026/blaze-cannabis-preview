import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  clearAuthSession,
  DEMO_ACCOUNTS,
  readAuthSession,
  verifyCredentials,
  writeAuthSession,
} from '@/lib/auth';

describe('auth session persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('reports no session on a first visit', () => {
    expect(readAuthSession()).toBeNull();
  });

  it('reports the written session after writing', () => {
    writeAuthSession({ role: 'owner', username: 'adminblaze' });
    expect(readAuthSession()).toEqual({ role: 'owner', username: 'adminblaze' });
  });

  it('writes the documented storage key as JSON', () => {
    writeAuthSession({ role: 'shopper', username: 'userblaze' });
    expect(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual({
      role: 'shopper',
      username: 'userblaze',
    });
  });

  it('clears the session', () => {
    writeAuthSession({ role: 'owner', username: 'adminblaze' });
    clearAuthSession();
    expect(readAuthSession()).toBeNull();
  });

  it('treats corrupt JSON in storage as no session', () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'not json');
    expect(readAuthSession()).toBeNull();
  });

  it('treats an unrecognized role value in storage as no session', () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: 'superadmin', username: 'x' }));
    expect(readAuthSession()).toBeNull();
  });

  it('treats the legacy boolean-string value as no session', () => {
    // Pre-existing installs may still carry the old admin gate's plain
    // "true" value under this key; it must not be mistaken for a session.
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    expect(readAuthSession()).toBeNull();
  });
});

describe('verifyCredentials', () => {
  it('accepts the owner credentials', () => {
    expect(verifyCredentials('adminblaze', 'blaze123')).toEqual({ role: 'owner', username: 'adminblaze' });
  });

  it('accepts the shopper credentials', () => {
    expect(verifyCredentials('userblaze', 'blaze123')).toEqual({ role: 'shopper', username: 'userblaze' });
  });

  it('is case-insensitive on the owner username', () => {
    expect(verifyCredentials('AdminBlaze', 'blaze123')).toEqual({ role: 'owner', username: 'adminblaze' });
  });

  it('is case-insensitive on the shopper username', () => {
    expect(verifyCredentials('USERBLAZE', 'blaze123')).toEqual({ role: 'shopper', username: 'userblaze' });
  });

  it('trims surrounding whitespace from the username', () => {
    expect(verifyCredentials('  adminblaze  ', 'blaze123')).toEqual({ role: 'owner', username: 'adminblaze' });
    expect(verifyCredentials('\tuserblaze\n', 'blaze123')).toEqual({ role: 'shopper', username: 'userblaze' });
  });

  it('combines trimming and case-insensitivity', () => {
    expect(verifyCredentials('  ADMINBLAZE  ', 'blaze123')).toEqual({ role: 'owner', username: 'adminblaze' });
  });

  it('rejects an unknown username', () => {
    expect(verifyCredentials('owner', 'blaze123')).toBeNull();
    expect(verifyCredentials('owner@blaze.demo', 'blaze')).toBeNull();
  });

  it('rejects a wrong password for the owner username', () => {
    expect(verifyCredentials('adminblaze', 'wrongpass')).toBeNull();
  });

  it('rejects a wrong password for the shopper username', () => {
    expect(verifyCredentials('userblaze', 'wrongpass')).toBeNull();
  });

  it('rejects an empty username', () => {
    expect(verifyCredentials('', 'blaze123')).toBeNull();
  });

  it('rejects an empty password', () => {
    expect(verifyCredentials('adminblaze', '')).toBeNull();
  });

  it('rejects both fields empty', () => {
    expect(verifyCredentials('', '')).toBeNull();
  });

  it('does not trim the password', () => {
    expect(verifyCredentials('adminblaze', ' blaze123 ')).toBeNull();
  });

  it('is case-sensitive on the password', () => {
    expect(verifyCredentials('adminblaze', 'BLAZE123')).toBeNull();
  });

  it('resolves role by the matched username, never by which account the password belongs to', () => {
    // Both demo passwords are identical by design, so this specifically guards
    // against an implementation that resolves role from a password match
    // instead of a username match (which would make the two roles equivalent).
    const owner = verifyCredentials('adminblaze', 'blaze123');
    const shopper = verifyCredentials('userblaze', 'blaze123');
    expect(owner?.role).toBe('owner');
    expect(shopper?.role).toBe('shopper');
    expect(owner?.role).not.toBe(shopper?.role);
  });

  it('never returns the owner role for the shopper username', () => {
    expect(verifyCredentials('userblaze', 'blaze123')?.role).not.toBe('owner');
  });

  it('never returns the shopper role for the owner username', () => {
    expect(verifyCredentials('adminblaze', 'blaze123')?.role).not.toBe('shopper');
  });

  it('exposes exactly the two documented demo accounts', () => {
    expect(DEMO_ACCOUNTS).toEqual([
      { role: 'owner', username: 'adminblaze', password: 'blaze123', label: 'Shop owner' },
      { role: 'shopper', username: 'userblaze', password: 'blaze123', label: 'Shopper' },
    ]);
  });
});
