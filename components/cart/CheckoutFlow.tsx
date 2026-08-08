'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { readAuthSession } from '@/lib/auth';
import type { Store } from '@/lib/catalog/types';
import type { CheckoutResult } from '@/lib/checkout/types';
import { type ContactErrors, type ContactForm, validateContact } from '@/lib/checkout/validate';
import { generateDemoOrderReference } from '@/lib/checkout/demo-order';
import { formatPrice } from '@/lib/format';
import { useCart } from './CartProvider';
import styles from './CheckoutFlow.module.css';

type Step = 'review' | 'details' | 'payment' | 'submitting' | 'result';
type PaymentMethod = 'in-store' | 'online';

/**
 * What "placing the order" actually did, kept as one discriminated union so the
 * result step never has to guess which mode produced it:
 *  - 'demo'  — mock mode. No network call was made; `reference` is a locally
 *    generated string with nothing behind it anywhere (see lib/checkout/demo-order.ts).
 *  - 'live'  — CATALOG_SOURCE=blaze. A real request went to /api/checkout, which
 *    replays the cart into an actual BLAZE ECOM order (see lib/checkout/replay.ts).
 *    `result` is the same CheckoutResult shape Phase 2 already defined.
 */
type Outcome = { kind: 'demo'; reference: string } | { kind: 'live'; result: CheckoutResult };

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'details', label: 'Pickup details' },
  { key: 'payment', label: 'Payment' },
  { key: 'result', label: 'Confirmation' },
];

function stepperIndex(step: Step): number {
  if (step === 'submitting') return 2;
  return STEP_LABELS.findIndex((s) => s.key === step);
}

interface Props {
  /** Fetched server-side once (getStore('brampton')) — shown on the confirmation
   * step so the shopper sees exactly where they're picking up from. Null only if
   * the catalog source genuinely has no store record. */
  store: Store | null;
}

export function CheckoutFlow({ store }: Props) {
  const { lines, subtotalCents, clear, catalogMode } = useCart();
  const [step, setStep] = useState<Step>('review');
  const [contact, setContact] = useState<ContactForm>({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('in-store');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Bumped whenever a review-step edit removes a line's DOM node but the step
  // itself doesn't change (still 'review', cart still non-empty) — without this,
  // the browser drops focus to <body> instead of somewhere deliberate. Normal
  // step transitions and the cart-becomes-empty transition are already covered
  // by `step/isEmpty` below and don't need this.
  const [focusTick, setFocusTick] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isEmpty = lines.length === 0;

  useEffect(() => {
    headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isEmpty, focusTick]);

  // Prefills the pickup-details name from the signed-in demo session, if any —
  // never overwrites something the shopper already typed. Checkout stays fully
  // usable without signing in; this only saves a step when there is a session.
  useEffect(() => {
    const session = readAuthSession();
    if (session?.username) {
      setContact((c) => (c.name.trim() ? c : { ...c, name: session.username }));
    }
  }, []);

  useEffect(() => {
    // Only a genuinely completed order (demo or real) clears the local cart —
    // every failure path leaves it exactly as it was, so the customer never
    // loses their cart over an order that may not exist.
    if (step !== 'result' || !outcome) return;
    const succeeded = outcome.kind === 'demo' || outcome.result.status === 'ok';
    if (succeeded) clear();
  }, [step, outcome, clear]);

  const removeLine = (productId: string, removeFn: (id: string) => void) => {
    removeFn(productId);
    setFocusTick((t) => t + 1);
  };

  const decrementQty = (
    productId: string,
    qty: number,
    setQtyFn: (id: string, qty: number) => void,
  ) => {
    setQtyFn(productId, qty - 1);
    if (qty - 1 <= 0) setFocusTick((t) => t + 1);
  };

  function handleContactSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateContact(contact);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep('payment');
  }

  async function placeOrder() {
    setStep('submitting');

    if (catalogMode !== 'blaze') {
      // Mock mode: zero network calls, ever. The "order" is a locally generated
      // reference with nothing behind it — see the Outcome doc comment above.
      const reference = generateDemoOrderReference();
      setOutcome({ kind: 'demo', reference });
      setStep('result');
      return;
    }

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
      setOutcome({
        kind: 'live',
        result: parsed ?? { status: 'api_error', message: 'The store sent back a response we could not read.' },
      });
    } catch {
      // fetch() itself threw: offline, DNS failure, connection refused. We never
      // got an HTTP response, so no order attempt could have reached the store.
      setOutcome({
        kind: 'live',
        result: { status: 'network_error', message: 'We could not reach the store. Your order was not placed.' },
      });
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

  const currentIndex = stepperIndex(step);

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/menu/brampton" className={styles.backLink}>← Continue shopping</Link>

      <p className={styles.demoBanner} role="note">
        <span className={styles.demoTag}>Demo</span>
        {catalogMode === 'blaze'
          ? 'Preview build talking to a staging order system. No payment is ever collected online here.'
          : 'This checkout is a demonstration. No real order or payment occurs.'}
      </p>

      <ol className={styles.stepper} aria-label="Checkout progress">
        {STEP_LABELS.map((s, i) => (
          <li
            key={s.key}
            className={styles.stepperItem}
            data-state={i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming'}
            aria-current={i === currentIndex ? 'step' : undefined}
          >
            <span className={styles.stepperIndex}>{i + 1}.</span>
            <span className={styles.stepperLabel}>{s.label}</span>
          </li>
        ))}
      </ol>

      {step === 'review' && (
        isEmpty ? (
          <div className={`${styles.panel} ${styles.emptyState}`}>
            <p className="kicker">Your cart</p>
            <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>Your cart is empty</h1>
            <p className={styles.note}>Add something from the menu to start a pickup order.</p>
            <Link href="/menu/brampton" className={styles.primary}>Browse the menu</Link>
          </div>
        ) : (
          <ReviewStep headingRef={headingRef} decrementQty={decrementQty} removeLine={removeLine} onContinue={() => setStep('details')} />
        )
      )}

      {step === 'details' && (
        <div className={styles.panel}>
          <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>Pickup details</h1>
          <p className={styles.note}>We&apos;ll use this to confirm your pickup order. This information is never transmitted anywhere in this demo.</p>
          <form onSubmit={handleContactSubmit} noValidate>
            {field('name', 'Name', 'text', 'name')}
            {field('phone', 'Phone', 'tel', 'tel')}
            {field('email', 'Email', 'email', 'email')}
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => setStep('review')}>Back</button>
              <button type="submit" className={styles.primary}>Continue to payment</button>
            </div>
          </form>
        </div>
      )}

      {step === 'payment' && (
        <div className={styles.panel}>
          <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>Payment</h1>
          <p className={styles.note}>Choose how you&apos;d like to pay. No payment details are collected here.</p>

          <div className={styles.paymentOptions} role="radiogroup" aria-label="Payment method">
            <label className={styles.paymentOption} data-selected={paymentMethod === 'in-store'}>
              <input
                type="radio"
                name="payment-method"
                value="in-store"
                checked={paymentMethod === 'in-store'}
                onChange={() => setPaymentMethod('in-store')}
              />
              <span className={styles.paymentOptionBody}>
                <span className={styles.paymentOptionTitle}>Pay in store on pickup</span>
                <span className={styles.paymentOptionDesc}>
                  Pay by cash, debit, or credit when you pick up your order in Brampton — this is how
                  the shop takes payment today.
                </span>
              </span>
            </label>

            <label className={styles.paymentOption} data-selected={paymentMethod === 'online'}>
              <input
                type="radio"
                name="payment-method"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
              />
              <span className={styles.paymentOptionBody}>
                <span className={styles.paymentOptionTitle}>
                  Pay online <span className={styles.availableTag}>Available when connected</span>
                </span>
                <span className={styles.paymentOptionDesc}>
                  Will run through the store&apos;s payment provider once connected. Nothing is charged
                  in this preview.
                </span>
              </span>
            </label>
          </div>

          <div className={styles.reviewTotal}>
            <span>Total due at pickup</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setStep('details')}>Back</button>
            <button type="button" className={styles.primary} onClick={placeOrder} disabled={isEmpty}>
              {catalogMode === 'blaze' ? 'Place order' : 'Confirm order'}
            </button>
          </div>
        </div>
      )}

      {step === 'submitting' && (
        <div className={styles.panel}>
          <div className={styles.submitting} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>Placing your order…</h1>
            <p className={styles.note}>
              {catalogMode === 'blaze'
                ? "This can take up to a minute while we confirm with the store. Please don't close this window."
                : 'One moment…'}
            </p>
          </div>
        </div>
      )}

      {step === 'result' && (
        <ResultStep headingRef={headingRef} outcome={outcome} store={store} onBackToReview={() => setStep('review')} onRetry={placeOrder} />
      )}
    </div>
  );
}

function ReviewStep({
  headingRef,
  decrementQty,
  removeLine,
  onContinue,
}: {
  headingRef: React.RefObject<HTMLHeadingElement>;
  decrementQty: (productId: string, qty: number, setQtyFn: (id: string, qty: number) => void) => void;
  removeLine: (productId: string, removeFn: (id: string) => void) => void;
  onContinue: () => void;
}) {
  const { lines, subtotalCents, setQty, remove } = useCart();

  return (
    <div className={styles.panel}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>Review your order</h1>
      <p className={styles.note}>Check what you&apos;re picking up, and adjust anything before you continue.</p>

      <ul className={styles.reviewList}>
        {lines.map((line) => (
          <li key={line.productId} className={styles.reviewItem}>
            {line.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={line.image} alt="" className={styles.reviewThumb} />
            ) : (
              <span className={styles.reviewThumb} aria-hidden="true" />
            )}
            <div className={styles.reviewItemBody}>
              <p className={styles.reviewBrand}>{line.brand}</p>
              <p className={styles.reviewName}>{line.name}</p>
              <p className={styles.reviewUnitPrice}>{formatPrice(line.priceCents)} each</p>
              <div className={styles.reviewQtyRow}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  aria-label={`Decrease quantity of ${line.name}`}
                  onClick={() => decrementQty(line.productId, line.qty, setQty)}
                >
                  −
                </button>
                <span aria-live="polite" className={styles.qtyValue}>{line.qty}</span>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  aria-label={`Increase quantity of ${line.name}`}
                  onClick={() => setQty(line.productId, line.qty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Remove ${line.name}`}
                  onClick={() => removeLine(line.productId, remove)}
                >
                  Remove
                </button>
              </div>
            </div>
            <p className={styles.reviewLineTotal}>{formatPrice(line.priceCents * line.qty)}</p>
          </li>
        ))}
      </ul>

      <div className={styles.reviewTotal}>
        <span>Subtotal</span>
        <span>{formatPrice(subtotalCents)}</span>
      </div>
      <p className={styles.note}>Taxes are calculated by the store. Pickup, ASAP — Blaze Cannabis, Brampton.</p>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onContinue}>Continue to pickup details</button>
      </div>
    </div>
  );
}

function ResultStep({
  headingRef,
  outcome,
  store,
  onBackToReview,
  onRetry,
}: {
  headingRef: React.RefObject<HTMLHeadingElement>;
  outcome: Outcome | null;
  store: Store | null;
  onBackToReview: () => void;
  onRetry: () => void;
}) {
  const StoreBox = () =>
    store ? (
      <div className={styles.storeBox}>
        <p className={styles.storeName}>{store.name}</p>
        <p className={styles.storeAddress}>
          {store.address}
          <br />
          {store.city}, {store.province} {store.postalCode}
        </p>
      </div>
    ) : null;

  if (outcome?.kind === 'demo') {
    return (
      <div className={styles.panel}>
        <p className="kicker">
          Order placed <span className={styles.demoTag}>Demo</span>
        </p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>We&apos;ll have it ready</h1>
        <p className={styles.orderNumber}>Order ref. {outcome.reference}</p>
        <ul className={styles.checklist}>
          <li>Bring valid government-issued photo ID (19+) to pick up.</li>
          <li>Payment is completed in person at pickup.</li>
        </ul>
        <StoreBox />
        <p className={styles.demoDisclaimer}>
          This is a demo confirmation — no real order or payment was created. Live ordering runs
          through the store&apos;s real system when connected.
        </p>
        <div className={styles.actions}>
          <Link href="/menu/brampton" className={styles.primary}>Done</Link>
        </div>
      </div>
    );
  }

  const result = outcome?.kind === 'live' ? outcome.result : null;

  if (result?.status === 'ok') {
    return (
      <div className={styles.panel}>
        <p className="kicker">Order placed</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>We&apos;ll have it ready</h1>
        <p className={styles.orderNumber}>Order #{result.orderNumber}</p>
        <ul className={styles.checklist}>
          <li>Bring valid government-issued photo ID (19+) to pick up.</li>
          <li>Payment is completed in person at pickup.</li>
        </ul>
        <StoreBox />
        <div className={styles.actions}>
          <Link href="/menu/brampton" className={styles.primary}>Done</Link>
        </div>
      </div>
    );
  }

  // Every failure path lands here — validation / network / unexpected API error —
  // each with its own copy, so the customer is never left guessing what happened
  // or whether an order exists. See lib/checkout/types.ts for why "pending" is a
  // flag on api_error rather than its own status. Also covers the (should-be
  // unreachable) case where `outcome` is still null.
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
      <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>{heading}</h1>
      <p className={styles.note}>{result?.message ?? 'Something unexpected happened.'}</p>
      <p className={styles.note}>{reassurance}</p>
      {result && 'cartUuid' in result && result.cartUuid && (
        <p className={styles.reference}>Reference: {result.cartUuid}</p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onBackToReview}>Back to review</button>
        {result?.status !== 'validation_failed' && (
          <button type="button" className={styles.primary} onClick={onRetry}>Try again</button>
        )}
      </div>
    </div>
  );
}
