'use client';

import { useEffect, type RefObject } from 'react';

interface Options {
  /** Skip entirely — pass the result of useReducedMotion(). */
  disabled?: boolean;
}

/**
 * Writes --px and --py (each roughly -1..1) onto the container as the pointer
 * moves across it. Layers multiply these by their own depth in CSS, so the
 * whole effect costs one rAF and two custom properties.
 *
 * Pointer-only by design: touch devices have no hover position, and the hero
 * gives them a scroll-linked drift instead.
 */
export function usePointerParallax(ref: RefObject<HTMLElement>, options: Options = {}): void {
  const { disabled = false } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const write = () => {
      frame = 0;
      element.style.setProperty('--px', px.toFixed(3));
      element.style.setProperty('--py', py.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(write);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(write);
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);

    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      // Leave no stale offset behind: a disabled or unmounted parallax must let
      // its layers settle back to neutral, not freeze at the last pointer position.
      element.style.removeProperty('--px');
      element.style.removeProperty('--py');
    };
  }, [ref, disabled]);
}
