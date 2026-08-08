'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageProcessingError, processImageFile } from '@/lib/admin-image';
import type { Category, Product } from '@/lib/catalog/types';
import styles from './EditProductDialog.module.css';

interface Props {
  /** The product as currently shown (catalog data with any existing
   * overrides already applied) — the dialog's starting draft. */
  product: Product;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    brand: string;
    category: string;
    /** undefined = leave the image override untouched; '' = remove (fallback
     * tile); any other string = the new downscaled image. */
    image: string | undefined;
  }) => void;
}

/**
 * Marks everything outside `target` inert, up to (but not including) `boundary`.
 * Copied from FilterPanel's helper of the same name (see components/menu/FilterPanel.tsx)
 * — this dialog lives inside #site-content alongside the rest of the admin
 * console, same as FilterPanel and NavDrawer, so it needs the same walk-up
 * approach rather than inerting #site-content directly (which would inert the
 * dialog too).
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

export function EditProductDialog({ product, categories, isOpen, onClose, onSave }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState(product.category);
  // undefined = no change made this session (Save leaves the image override
  // as-is); null = "Remove image" was clicked (Save writes the '' sentinel);
  // a string = a newly processed upload (Save writes that data URL).
  const [imageDraft, setImageDraft] = useState<string | null | undefined>(undefined);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Re-seed the draft from the current product every time the dialog opens
  // (not just on mount — the same dialog instance is reused across rows/opens).
  useEffect(() => {
    if (!isOpen) return;
    setName(product.name);
    setBrand(product.brand);
    setCategory(product.category);
    setImageDraft(undefined);
    setImageError(null);
    setProcessing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product.id]);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const siteContent = document.getElementById('site-content');

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (firstFieldRef.current ?? panel)?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const releaseInert = panel && siteContent ? setInertAroundTarget(panel, siteContent) : () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      releaseInert();
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentImage = product.images[0] ?? null;
  const previewSrc = imageDraft === undefined ? currentImage : imageDraft;
  const canRemove = previewSrc !== null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change event.
    e.target.value = '';
    if (!file) return;

    setImageError(null);
    setProcessing(true);
    try {
      const dataUrl = await processImageFile(file);
      setImageDraft(dataUrl);
    } catch (err) {
      setImageError(err instanceof ImageProcessingError ? err.message : 'Could not process that image.');
    } finally {
      setProcessing(false);
    }
  };

  const nameValid = name.trim() !== '';
  const brandValid = brand.trim() !== '';
  const canSave = nameValid && brandValid && !processing;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      brand: brand.trim(),
      category,
      image: imageDraft === undefined ? undefined : imageDraft === null ? '' : imageDraft,
    });
  };

  return (
    // No aria-hidden here: this element wraps the dialog itself, and
    // aria-hidden on an ancestor hides the whole subtree (including the
    // role="dialog" descendant) from assistive tech. It exists only so a
    // click outside the panel closes the dialog.
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-product-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 id="edit-product-title" className={styles.title}>Edit product</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close edit dialog">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-name">Name</label>
            <input
              ref={firstFieldRef}
              id="edit-name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {!nameValid && <p className={styles.fieldError}>Name can&apos;t be empty.</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-brand">Brand</label>
            <input
              id="edit-brand"
              type="text"
              className={styles.input}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            {!brandValid && <p className={styles.fieldError}>Brand can&apos;t be empty.</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-category">Category</label>
            <select
              id="edit-category"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <p className={styles.label} id="edit-image-label">Image</p>
            <div className={styles.imageRow}>
              <div className={styles.preview}>
                {previewSrc ? (
                  // A raw <img> rather than next/image: the preview may be a
                  // freshly processed data URL that hasn't gone into an
                  // override yet, this is a small fixed-size thumbnail, and
                  // Next's image optimizer path adds nothing for a data URL
                  // it already treats as unoptimized.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="" className={styles.previewImg} />
                ) : (
                  <span className={styles.previewFallback} aria-hidden="true">{brand.charAt(0) || '?'}</span>
                )}
              </div>
              <div className={styles.imageActions}>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                  aria-describedby="edit-image-label"
                >
                  {processing ? 'Processing…' : 'Upload image'}
                </button>
                {/* tabIndex={-1}: this input is never a direct Tab stop — it's
                    visually hidden and activated only via the "Upload image"
                    button above, which proxies the click. Leaving it in the
                    tab order would land keyboard focus on an invisible
                    control with no visible focus indicator. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  tabIndex={-1}
                  className="sr-only"
                  aria-label="Choose a product image file"
                  onChange={handleFileChange}
                />
                {canRemove && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => { setImageDraft(null); setImageError(null); }}
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
            <p className={styles.hint}>
              Uploaded photos are resized to at most 800px and stay in this browser tab only.
            </p>
            {imageError && <p className={styles.fieldError} role="alert">{imageError}</p>}
          </div>
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.save} onClick={handleSave} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
