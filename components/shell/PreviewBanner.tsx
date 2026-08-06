'use client';

import { useState } from 'react';
import styles from './PreviewBanner.module.css';

/**
 * Shown only when NEXT_PUBLIC_PREVIEW_BANNER is set, which is done on the
 * Netlify preview and nowhere else — so local development stays uncluttered
 * and a future real deployment shows nothing by simply not setting it.
 */
export function PreviewBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NEXT_PUBLIC_PREVIEW_BANNER !== 'true' || dismissed) return null;

  return (
    <aside className={styles.banner} role="note" aria-label="Preview notice">
      <span className={styles.dot} aria-hidden="true" />
      <p className={styles.text}>
        <strong>Design preview</strong>
        <span>
          Not the live Blaze Cannabis store. Products and prices are shown for design
          purposes and cannot be ordered here.
        </span>
      </p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss preview notice"
      >
        ×
      </button>
    </aside>
  );
}
