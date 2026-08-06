import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_IDENTITIES,
  ADMIN_PASSCODE,
  ADMIN_STORAGE_KEY,
  readAdminUnlocked,
  verifyAdminCredentials,
  writeAdminUnlocked,
} from '@/lib/admin-gate';

describe('admin gate persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('reports locked on a first visit', () => {
    expect(readAdminUnlocked()).toBe(false);
  });

  it('reports unlocked after writing', () => {
    writeAdminUnlocked();
    expect(readAdminUnlocked()).toBe(true);
  });

  it('writes the documented storage key', () => {
    writeAdminUnlocked();
    expect(window.localStorage.getItem(ADMIN_STORAGE_KEY)).toBe('true');
  });

  it('treats any other stored value as locked', () => {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, 'maybe');
    expect(readAdminUnlocked()).toBe(false);
  });
});

describe('verifyAdminCredentials', () => {
  it('accepts the email-form identity with the correct passcode', () => {
    expect(verifyAdminCredentials('owner@blaze.demo', ADMIN_PASSCODE)).toBe(true);
  });

  it('accepts the short-form identity with the correct passcode', () => {
    expect(verifyAdminCredentials('owner', ADMIN_PASSCODE)).toBe(true);
  });

  it('is case-insensitive on the identity (email form)', () => {
    expect(verifyAdminCredentials('OWNER@BLAZE.DEMO', ADMIN_PASSCODE)).toBe(true);
  });

  it('is case-insensitive on the identity (short form)', () => {
    expect(verifyAdminCredentials('Owner', ADMIN_PASSCODE)).toBe(true);
  });

  it('trims surrounding whitespace from the identity', () => {
    expect(verifyAdminCredentials('  owner@blaze.demo  ', ADMIN_PASSCODE)).toBe(true);
    expect(verifyAdminCredentials('\towner\n', ADMIN_PASSCODE)).toBe(true);
  });

  it('combines trimming and case-insensitivity', () => {
    expect(verifyAdminCredentials('  OWNER@BLAZE.DEMO  ', ADMIN_PASSCODE)).toBe(true);
  });

  it('rejects an unknown identity', () => {
    expect(verifyAdminCredentials('admin@blaze.demo', ADMIN_PASSCODE)).toBe(false);
  });

  it('rejects a wrong passcode', () => {
    expect(verifyAdminCredentials('owner', 'nope')).toBe(false);
  });

  it('rejects an empty identity', () => {
    expect(verifyAdminCredentials('', ADMIN_PASSCODE)).toBe(false);
  });

  it('rejects an empty passcode', () => {
    expect(verifyAdminCredentials('owner', '')).toBe(false);
  });

  it('rejects both fields empty', () => {
    expect(verifyAdminCredentials('', '')).toBe(false);
  });

  it('is case-sensitive on the passcode (kept exact, per spec)', () => {
    expect(verifyAdminCredentials('owner', 'BLAZE')).toBe(false);
  });

  it('does not trim the passcode', () => {
    expect(verifyAdminCredentials('owner', ' blaze ')).toBe(false);
  });

  it('exposes the accepted identities as a named constant', () => {
    expect(ADMIN_IDENTITIES).toEqual(['owner@blaze.demo', 'owner']);
  });

  it('keeps the passcode constant unchanged', () => {
    expect(ADMIN_PASSCODE).toBe('blaze');
  });
});
