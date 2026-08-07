'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, verifyCredentials, writeAuthSession } from '@/lib/auth';
import styles from './SignInScreen.module.css';

type FormError = 'empty' | 'invalid' | null;

export function SignInScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FormError>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Deliberately not gated behind a session check: signing in again from here
  // (even while already signed in) is how the client swaps between the owner
  // and shopper demo accounts without hunting for a "sign out" control first.
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('empty');
      return;
    }
    const session = verifyCredentials(username, password);
    if (!session) {
      setError('invalid');
      return;
    }
    writeAuthSession(session);
    router.replace(session.role === 'owner' ? '/admin' : '/');
  };

  const handleFieldChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError(null);
  };

  const errorMessage =
    error === 'empty'
      ? 'Enter both a username and password to continue.'
      : error === 'invalid'
        ? "That's not it — check the demo credentials below and try again."
        : null;

  return (
    <div className={styles.page}>
      <form className={styles.panel} onSubmit={submit} aria-labelledby="signin-title" noValidate>
        <div className={styles.brand}>
          BLAZE <span className={styles.demoTag}>Sign-in Demo</span>
        </div>
        <div className="hairline" />
        <h1 id="signin-title" className={styles.title}>Sign in</h1>
        <p className={styles.copy}>
          This is a demonstration sign-in built for the sales pitch — not a real account
          system. It does not authenticate or protect anything: there is no server, no
          session, and nothing is hashed or stored securely.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signin-username">Username</label>
          <input
            ref={usernameRef}
            id="signin-username"
            name="username"
            type="text"
            autoComplete="username"
            className={styles.input}
            value={username}
            onChange={handleFieldChange(setUsername)}
            aria-invalid={error !== null}
            aria-describedby={error ? 'signin-error' : undefined}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            value={password}
            onChange={handleFieldChange(setPassword)}
            aria-invalid={error !== null}
            aria-describedby={error ? 'signin-error' : undefined}
          />
        </div>

        {errorMessage && (
          <p id="signin-error" role="alert" className={styles.error}>
            {errorMessage}
          </p>
        )}

        <button type="submit" className={styles.submit}>Sign in</button>

        <div className={styles.hintBlock}>
          <p className={styles.hintLabel}>Demo access — for trying this preview, not a real account</p>
          <table className={styles.credTable}>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Username</th>
                <th scope="col">Password</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ACCOUNTS.map((account) => (
                <tr key={account.username}>
                  <th scope="row">{account.label}</th>
                  <td>{account.username}</td>
                  <td>{account.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
