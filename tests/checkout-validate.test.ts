import { describe, expect, it } from 'vitest';
import { EMAIL_RE, PHONE_RE, validateContact } from '@/lib/checkout/validate';

describe('validateContact', () => {
  const valid = { name: 'Jamie Rivera', phone: '905-555-0199', email: 'jamie@example.com' };

  it('accepts a fully valid contact form', () => {
    expect(validateContact(valid)).toEqual({});
  });

  it('requires a non-blank name', () => {
    expect(validateContact({ ...valid, name: '' }).name).toBe('Enter your name.');
    expect(validateContact({ ...valid, name: '   ' }).name).toBe('Enter your name.');
  });

  it('rejects an obviously malformed phone number', () => {
    expect(validateContact({ ...valid, phone: '' }).phone).toBe('Enter a valid phone number.');
    expect(validateContact({ ...valid, phone: 'abc' }).phone).toBe('Enter a valid phone number.');
    expect(validateContact({ ...valid, phone: '12345' }).phone).toBe('Enter a valid phone number.');
  });

  it('accepts common phone formats', () => {
    for (const phone of ['9055550199', '(905) 555-0199', '+1 905 555 0199', '905.555.0199']) {
      expect(validateContact({ ...valid, phone }).phone).toBeUndefined();
    }
  });

  it('rejects an obviously malformed email', () => {
    expect(validateContact({ ...valid, email: '' }).email).toBe('Enter a valid email address.');
    expect(validateContact({ ...valid, email: 'not-an-email' }).email).toBe('Enter a valid email address.');
    expect(validateContact({ ...valid, email: 'jamie@' }).email).toBe('Enter a valid email address.');
  });

  it('reports every failing field at once, not just the first', () => {
    const errors = validateContact({ name: '', phone: '', email: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'phone']);
  });

  it('exposes the same regexes it validates with', () => {
    expect(EMAIL_RE.test('jamie@example.com')).toBe(true);
    expect(PHONE_RE.test('905-555-0199')).toBe(true);
  });
});
