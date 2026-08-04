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
