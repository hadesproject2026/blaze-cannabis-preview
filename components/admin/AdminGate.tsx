'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_IDENTITIES,
  ADMIN_PASSCODE,
  readAdminUnlocked,
  verifyAdminCredentials,
  writeAdminUnlocked,
} from '@/lib/admin-gate';
import styles from './AdminGate.module.css';

type GateError = 'empty' | 'invalid' | null;

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [identity, setIdentity] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<GateError>(null);
  const identityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatus(readAdminUnlocked() ? 'unlocked' : 'locked');
  }, []);

  useEffect(() => {
    if (status === 'locked') identityRef.current?.focus();
  }, [status]);

  if (status === 'checking') return null;

  if (status === 'unlocked') return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.trim() || !passcode) {
      setError('empty');
      return;
    }
    if (verifyAdminCredentials(identity, passcode)) {
      writeAdminUnlocked();
      setStatus('unlocked');
    } else {
      setError('invalid');
    }
  };

  const handleFieldChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError(null);
  };

  const errorMessage =
    error === 'empty'
      ? 'Enter both the email/username and passcode to continue.'
      : error === 'invalid'
        ? "That's not it — check the demo credentials below and try again."
        : null;

  return (
    <div className={styles.overlay}>
      <form
        className={styles.panel}
        onSubmit={submit}
        aria-labelledby="admin-gate-title"
        noValidate
      >
        <div className={styles.brand}>
          BLAZE <span className={styles.demoTag}>Admin Demo</span>
        </div>
        <div className="hairline" />
        <h1 id="admin-gate-title" className={styles.title}>Sign in to the demo console</h1>
        <p className={styles.copy}>
          This looks like a sign-in, but it is a demonstration built for the sales pitch —
          not real security. It does not authenticate or protect anything.
        </p>
        <p className={styles.hint}>
          Demo access — sign in with{' '}
          {ADMIN_IDENTITIES.map((id, index) => (
            <span key={id}>
              {index > 0 && ' or '}
              <strong>{id}</strong>
            </span>
          ))}
          , passcode <strong>{ADMIN_PASSCODE}</strong>.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-identity">Email or username</label>
          <input
            ref={identityRef}
            id="admin-identity"
            type="text"
            autoComplete="username"
            className={styles.input}
            value={identity}
            onChange={handleFieldChange(setIdentity)}
            aria-invalid={error !== null}
            aria-describedby={error ? 'admin-gate-error' : undefined}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-passcode">Passcode</label>
          <input
            id="admin-passcode"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            value={passcode}
            onChange={handleFieldChange(setPasscode)}
            aria-invalid={error !== null}
            aria-describedby={error ? 'admin-gate-error' : undefined}
          />
        </div>

        {errorMessage && (
          <p id="admin-gate-error" role="alert" className={styles.error}>
            {errorMessage}
          </p>
        )}

        <button type="submit" className={styles.submit}>Sign in</button>
      </form>
    </div>
  );
}
