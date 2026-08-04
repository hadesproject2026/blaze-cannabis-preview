'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * True when the element is off-screen or the tab is hidden. Ambient loops read
 * this so a backgrounded page stops burning battery.
 */
export function useInViewPaused(ref: RefObject<Element>): boolean {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let onScreen = true;
    const sync = () => setPaused(!onScreen || document.hidden);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: '100px' },
    );

    observer.observe(element);
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref]);

  return paused;
}
