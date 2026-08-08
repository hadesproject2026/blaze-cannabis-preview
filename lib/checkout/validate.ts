/**
 * Pure pickup-details validation, shared by every checkout surface (currently the
 * full-page /checkout journey's "Pickup details" step — see components/cart/
 * CheckoutFlow.tsx). Kept dependency-free and framework-free so it can be unit
 * tested directly, and so the mock-mode demo path and the live BLAZE ECOM path
 * validate identically rather than drifting apart.
 *
 * Nothing here is transmitted anywhere on its own — it only decides whether the
 * caller's contact form is well-formed enough to advance.
 */

export interface ContactForm {
  name: string;
  phone: string;
  email: string;
}

export interface ContactErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: accepts common phone formats with digits, spaces, dashes,
// parens, and an optional leading "+", rather than a strict E.164 parser. The
// first character may also be "(" — "(905) 555-0199" is a very common format
// and was previously rejected because only "+"/digit were allowed to start it.
export const PHONE_RE = /^[+\d(][\d()\-.\s]{6,19}$/;

export function validateContact(form: ContactForm): ContactErrors {
  const errors: ContactErrors = {};
  if (!form.name.trim()) errors.name = 'Enter your name.';
  if (!PHONE_RE.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}
