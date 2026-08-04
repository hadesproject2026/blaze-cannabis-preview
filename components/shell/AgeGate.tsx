'use client';

import { useEffect, useRef, useState } from 'react';
import { readAgeVerified, writeAgeVerified } from '@/lib/age-gate';
import styles from './AgeGate.module.css';

export function AgeGate() {
  const [status, setStatus] = useState<'checking' | 'blocked' | 'denied' | 'allowed'>('checking');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deniedRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setStatus(readAgeVerified() ? 'allowed' : 'blocked');
  }, []);

  useEffect(() => {
    if (status === 'blocked') confirmRef.current?.focus();
    if (status === 'denied') deniedRef.current?.focus();
    document.body.style.overflow = status === 'blocked' || status === 'denied' ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  useEffect(() => {
    const content = document.getElementById('site-content');
    if (!content) return;

    // aria-modal is only a hint to assistive tech. `inert` is what actually stops
    // Tab and the screen-reader cursor from reaching the store behind the gate.
    const blocking = status === 'blocked' || status === 'denied';
    if (blocking) content.setAttribute('inert', '');
    else content.removeAttribute('inert');

    return () => content.removeAttribute('inert');
  }, [status]);

  if (status === 'checking' || status === 'allowed') return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className={styles.panel}>
        <div className={styles.brand}>BLAZE</div>
        <div className="hairline" />
        {status === 'denied' ? (
          <>
            <h2 id="age-gate-title" className={styles.title} ref={deniedRef} tabIndex={-1}>
              Come back another time
            </h2>
            <p className={styles.denied}>You must be 19 or older to view this site.</p>
          </>
        ) : (
          <>
            <h2 id="age-gate-title" className={styles.title}>Are you 19 or older?</h2>
            <p className={styles.copy}>
              You must be of legal age to enter. Valid government-issued ID is required at pickup.
            </p>
            <div className={styles.actions}>
              <button
                ref={confirmRef}
                type="button"
                className={styles.confirm}
                onClick={() => { writeAgeVerified(); setStatus('allowed'); }}
              >
                Yes, I am 19+
              </button>
              <button type="button" className={styles.deny} onClick={() => setStatus('denied')}>
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
