'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { type AuthSession, clearAuthSession, readAuthSession } from '@/lib/auth';
import styles from './AuthStatus.module.css';

/**
 * Sign-in status for the storefront header. Reads the demo session from
 * localStorage on mount (there is no server session) and renders nothing
 * until then, matching CartProvider's hydration pattern — avoids a
 * server/client markup mismatch and a flash of the wrong state.
 *
 * Deliberately does not gate anything here: the storefront stays fully
 * browsable signed out. This is purely a status + entry point display.
 */
export function AuthStatus() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readAuthSession());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (!session) {
    return (
      <Link href="/signin" className={styles.signInLink}>
        Sign in
      </Link>
    );
  }

  return (
    <div className={styles.status}>
      <span className={styles.username} title={session.username}>{session.username}</span>
      {session.role === 'owner' && (
        <Link href="/admin" className={styles.adminLink}>
          Admin
        </Link>
      )}
      <button
        type="button"
        className={styles.signOut}
        onClick={() => {
          clearAuthSession();
          setSession(null);
        }}
      >
        Sign out
      </button>
    </div>
  );
}
