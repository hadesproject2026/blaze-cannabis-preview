'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readAuthSession } from '@/lib/auth';

/**
 * Client-side gate for the admin demo console. There is no server session to
 * check against — role lives in localStorage, written by the shared /signin
 * screen (see lib/auth.ts) — so this reads it once after mount and either
 * renders the console or bounces to /signin. A shopper session, or no
 * session at all, both redirect the same way: /admin never renders its own
 * sign-in UI anymore, that lives solely at /signin.
 *
 * Renders nothing while unresolved, so there is no flash of the console
 * before an unauthorized visitor is redirected away.
 */
export function RequireOwner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = readAuthSession();
    if (session?.role === 'owner') {
      setAuthorized(true);
    } else {
      router.replace('/signin');
    }
  }, [router]);

  if (!authorized) return null;

  return <>{children}</>;
}
