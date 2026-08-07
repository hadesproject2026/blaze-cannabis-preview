'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './NavDrawer.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Marks everything outside `target` inert, up to (but not including) `boundary`.
 *
 * `target` (the drawer's scrim + panel wrapper) lives inside #site-content
 * alongside the rest of the page, so we can't just set `inert` on #site-content
 * — that would inert the drawer too, since `inert` applies to the whole subtree
 * with no way for a descendant to opt back out. Instead we walk from `target`
 * up to `boundary`, and at each level inert the target's siblings only. That
 * reaches every other region of the page (rest of the header, main, footer)
 * without ever touching an ancestor of the drawer itself.
 *
 * Copied from FilterPanel's helper of the same name — this component sits in
 * the same position in the tree (inside #site-content, not a sibling of it
 * the way AgeGate/CartDrawer are), so it needs the same walk-up approach.
 */
function setInertAroundTarget(target: HTMLElement, boundary: HTMLElement): () => void {
  const inerted: Element[] = [];
  let node: Element | null = target;

  while (node && node !== boundary) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
    }
    node = parent;
  }

  return () => {
    for (const el of inerted) el.removeAttribute('inert');
  };
}

export function NavDrawer({ isOpen, onClose }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // The drawer stays mounted at all times (closed = off-canvas via CSS) so the
  // open transition has something to animate from. That means, unlike
  // FilterPanel's `display:none` mobile sheet, a closed NavDrawer is still in
  // the DOM — so this single effect owns the wrapper's own `inert` state too:
  // inert whenever closed (including on first mount), interactive whenever
  // open, so a closed-but-visible-in-the-DOM link is never Tab-reachable.
  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!isOpen) {
      wrapper?.setAttribute('inert', '');
      return;
    }

    wrapper?.removeAttribute('inert');

    const panel = panelRef.current;
    const siteContent = document.getElementById('site-content');

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const releaseInert = wrapper && siteContent ? setInertAroundTarget(wrapper, siteContent) : () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      releaseInert();
      wrapper?.setAttribute('inert', '');
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={styles.wrapper} data-open={isOpen}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        tabIndex={-1}
      >
        <div className={styles.head}>
          <span className={styles.brand}>BLAZE</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close navigation menu">
            ×
          </button>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <Link href="/" className={styles.navLink} onClick={onClose}>Home</Link>
          <Link href="/menu/brampton" className={styles.navLink} onClick={onClose}>Shop</Link>

          <div className={`hairline ${styles.divider}`} />

          <p className={`kicker ${styles.sectionLabel}`}>Quick links</p>
          <Link href="/menu/brampton?view=sale" className={styles.quickLink} onClick={onClose}>
            On Sale Items
          </Link>
          <Link href="/menu/brampton?view=new" className={styles.quickLink} onClick={onClose}>
            New Drops
          </Link>
          <Link href="/menu/brampton?view=dried-flower" className={styles.quickLink} onClick={onClose}>
            Dried Flower
          </Link>
          <Link href="/menu/brampton?view=ounces" className={styles.quickLink} onClick={onClose}>
            Ounce&apos;s
          </Link>
        </nav>

        <div className={styles.footer}>
          <div className={styles.authButtons}>
            {/* Sign-in is real now (see /signin), so this links there rather
                than showing the old "coming soon" notice. Registration still
                isn't a thing — there is no account store — so only the one
                button, rather than offering a Sign Up that cannot work. */}
            <Link href="/signin" className={styles.login} onClick={onClose}>
              Sign in
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
