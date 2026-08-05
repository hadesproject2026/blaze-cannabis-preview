'use client';

import { useEffect, useRef, useState } from 'react';
import { ADMIN_PASSCODE, readAdminUnlocked, writeAdminUnlocked } from '@/lib/admin-gate';
import styles from './AdminGate.module.css';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatus(readAdminUnlocked() ? 'unlocked' : 'locked');
  }, []);

  useEffect(() => {
    if (status === 'locked') inputRef.current?.focus();
  }, [status]);

  if (status === 'checking') return null;

  if (status === 'unlocked') return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSCODE) {
      writeAdminUnlocked();
      setStatus('unlocked');
    } else {
      setError(true);
    }
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.panel} onSubmit={submit} aria-labelledby="admin-gate-title">
        <div className={styles.brand}>
          BLAZE <span className={styles.demoTag}>Admin Demo</span>
        </div>
        <div className="hairline" />
        <h1 id="admin-gate-title" className={styles.title}>Enter the passcode</h1>
        <p className={styles.copy}>
          This is a demonstration admin area for the sales pitch, not a real login —
          it does not protect anything. The passcode is <strong>blaze</strong>.
        </p>
        <label className="sr-only" htmlFor="admin-passcode">Admin passcode</label>
        <input
          ref={inputRef}
          id="admin-passcode"
          type="text"
          autoComplete="off"
          className={styles.input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          aria-invalid={error}
          aria-describedby={error ? 'admin-gate-error' : undefined}
        />
        {error && (
          <p id="admin-gate-error" role="alert" className={styles.error}>
            That&apos;s not it — try &quot;blaze&quot;.
          </p>
        )}
        <button type="submit" className={styles.submit}>Enter</button>
      </form>
    </div>
  );
}
