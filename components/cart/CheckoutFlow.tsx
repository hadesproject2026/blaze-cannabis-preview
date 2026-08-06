'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatPrice } from '@/lib/format';
import type { CheckoutResult } from '@/lib/checkout/types';
import { useCart } from './CartProvider';
import styles from './CheckoutFlow.module.css';

type Step = 'contact' | 'review' | 'submitting' | 'result';

interface ContactForm {
  name: string;
  phone: string;
  email: string;
}

interface ContactErrors {
  name?: string;
  phone?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: accepts common phone formats with digits, spaces, dashes,
// parens, and an optional leading "+", rather than a strict E.164 parser.
const PHONE_RE = /^[+\d][\d()\-.\s]{6,19}$/;

function validateContact(form: ContactForm): ContactErrors {
  const errors: ContactErrors = {};
  if (!form.name.trim()) errors.name = 'Enter your name.';
  if (!PHONE_RE.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

interface Props {
  /** Return to the plain cart-lines view (e.g. "Back to cart", or after a validation
   * failure the customer needs to fix by editing quantities, which this component
   * doesn't have UI for). */
  onExit: () => void;
}

export function CheckoutFlow({ onExit }: Props) {
  const { lines, subtotalCents, clear } = useCart();
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState<ContactForm>({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    // Only a genuinely completed order clears the local cart — every failure path
    // (including the ambiguous "still confirming" one) leaves it exactly as it was,
    // so the customer never loses their cart over an order that may not exist.
    if (step === 'result' && result?.status === 'ok') clear();
  }, [step, result, clear]);

  function handleContactSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateContact(contact);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep('review');
  }

  async function placeOrder() {
    setStep('submitting');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          lines: lines.map((line) => ({ slug: line.slug, name: line.name, qty: line.qty })),
        }),
      });
      const parsed = (await response.json().catch(() => null)) as CheckoutResult | null;
      setResult(parsed ?? { status: 'api_error', message: 'The store sent back a response we could not read.' });
    } catch {
      // fetch() itself threw: offline, DNS failure, connection refused. We never got
      // an HTTP response, so no order attempt could have reached the store.
      setResult({ status: 'network_error', message: 'We could not reach the store. Your order was not placed.' });
    }
    setStep('result');
  }

  const field = (
    name: keyof ContactForm,
    label: string,
    type: string,
    autoComplete: string,
  ) => (
    <div className={styles.field}>
      <label htmlFor={`checkout-${name}`} className={styles.label}>{label}</label>
      <input
        id={`checkout-${name}`}
        type={type}
        autoComplete={autoComplete}
        className={styles.input}
        value={contact[name]}
        onChange={(e) => setContact((c) => ({ ...c, [name]: e.target.value }))}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `checkout-${name}-error` : undefined}
      />
      {errors[name] && (
        <p id={`checkout-${name}-error`} role="alert" className={styles.fieldError}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  if (step === 'contact') {
    return (
      <div className={styles.panel}>
        <h3 ref={headingRef} tabIndex={-1} className={styles.heading}>Contact details</h3>
        <p className={styles.note}>We&apos;ll use this to confirm your pickup order.</p>
        <form onSubmit={handleContactSubmit} noValidate>
          {field('name', 'Name', 'text', 'name')}
          {field('phone', 'Phone', 'tel', 'tel')}
          {field('email', 'Email', 'email', 'email')}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onExit}>Back to cart</button>
            <button type="submit" className={styles.primary}>Continue to review</button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className={styles.panel}>
        <h3 ref={headingRef} tabIndex={-1} className={styles.heading}>Review your order</h3>
        <ul className={styles.reviewLines}>
          {lines.map((line) => (
            <li key={line.productId} className={styles.reviewLine}>
              <span>{line.name} <span className={styles.reviewQty}>× {line.qty}</span></span>
              <span>{formatPrice(line.priceCents * line.qty)}</span>
            </li>
          ))}
        </ul>
        <div className={styles.reviewTotal}>
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        <p className={styles.note}>
          Taxes are calculated by the store. Pickup, ASAP — Blaze Cannabis, Brampton. Payment is
          completed in person.
        </p>
        <div className={styles.reviewContact}>
          <span>{contact.name}</span>
          <span>{contact.phone}</span>
          <span>{contact.email}</span>
          <button type="button" className={styles.linkButton} onClick={() => setStep('contact')}>Edit</button>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onExit}>Back to cart</button>
          <button type="button" className={styles.primary} onClick={placeOrder}>Place order</button>
        </div>
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className={styles.panel}>
        <div className={styles.submitting} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <h3 ref={headingRef} tabIndex={-1} className={styles.heading}>Placing your order…</h3>
          <p className={styles.note}>
            This can take up to a minute while we confirm with the store. Please don&apos;t close
            this window.
          </p>
        </div>
      </div>
    );
  }

  // step === 'result'
  if (result?.status === 'ok') {
    return (
      <div className={styles.panel}>
        <p className="kicker">Order placed</p>
        <h3 ref={headingRef} tabIndex={-1} className={styles.heading}>We&apos;ll have it ready</h3>
        <p className={styles.orderNumber}>Order #{result.orderNumber}</p>
        <ul className={styles.checklist}>
          <li>Bring valid government-issued photo ID (19+) to pick up.</li>
          <li>Payment is completed in person at pickup.</li>
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onExit}>Done</button>
        </div>
      </div>
    );
  }

  // Every failure path lands here — validation / network / unexpected API error —
  // each with its own copy, so the customer is never left guessing what happened or
  // whether an order exists. See lib/checkout/types.ts for why "pending" is a flag on
  // api_error rather than its own status.
  const isPending = result?.status === 'api_error' && result.pending;
  const heading =
    result?.status === 'validation_failed'
      ? 'This cart needs a change'
      : result?.status === 'network_error'
        ? "We couldn't reach the store"
        : isPending
          ? "We're still checking on this"
          : 'Your order was not placed';
  const reassurance = result?.status === 'validation_failed'
    ? 'No order was placed. Fix your cart and try again.'
    : isPending
      ? "We don't yet know whether this order went through. Please wait a minute and check back, or call the store before you head over."
      : 'No order was placed — nothing will happen. Your cart is unchanged.';

  return (
    <div className={styles.panel}>
      <p className={styles.errorKicker}>
        {result?.status === 'validation_failed' ? 'Could not place order' : isPending ? 'Still confirming' : 'Something went wrong'}
      </p>
      <h3 ref={headingRef} tabIndex={-1} className={styles.heading}>{heading}</h3>
      <p className={styles.note}>{result?.message}</p>
      <p className={styles.note}>{reassurance}</p>
      {result && 'cartUuid' in result && result.cartUuid && (
        <p className={styles.reference}>Reference: {result.cartUuid}</p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onExit}>Back to cart</button>
        {result?.status !== 'validation_failed' && (
          <button type="button" className={styles.primary} onClick={placeOrder}>Try again</button>
        )}
      </div>
    </div>
  );
}
