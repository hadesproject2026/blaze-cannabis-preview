'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.css';

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Safety net: if IntersectionObserver is unsupported, or its callback
    // never fires (some environments never composite a frame), content must
    // not stay stuck at opacity: 0 forever. Reveal it after a short window
    // regardless, so the fallback only matters when the real trigger fails.
    const fallback = window.setTimeout(() => setVisible(true), 1000);

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return () => window.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          window.clearTimeout(fallback);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={ref} className={styles.reveal} data-visible={visible} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
