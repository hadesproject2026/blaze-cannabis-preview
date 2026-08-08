'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useAdmin } from '@/components/admin/AdminProvider';
import { EditProductDialog } from '@/components/admin/EditProductDialog';
import { applyOverrides } from '@/lib/admin';
import type { Category, Product } from '@/lib/catalog/types';
import styles from './AdminProductsTable.module.css';

interface Props {
  products: Product[];
  categories: Category[];
}

export function AdminProductsTable({ products, categories }: Props) {
  const { overrides, setInStock, setPrice, setStaffPick, setName, setBrand, setCategory, setImage, resetOverrides } =
    useAdmin();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const overlaid = useMemo(() => applyOverrides(products, overrides), [products, overrides]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return overlaid;
    return overlaid.filter(
      (p) => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term),
    );
  }, [overlaid, search]);

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const editingProduct = editingId ? overlaid.find((p) => p.id === editingId) ?? null : null;
  const hasEdits = Object.keys(overrides).length > 0;

  return (
    <div className={styles.page}>
      <p className="kicker">Catalog</p>
      <h1 className={styles.title}>Products</h1>
      <p className={styles.lede}>
        Edits apply immediately for this session only — reload the page and the catalog resets to
        its original state.
      </p>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name or brand"
          aria-label="Search products by name or brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={styles.count}>
          {visible.length} of {products.length} products
        </span>
        <button
          type="button"
          className={styles.resetAll}
          onClick={resetOverrides}
          disabled={!hasEdits}
        >
          Reset all edits
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="sr-only">
            Products in the catalog, with stock, price, Budtender Select, and full-detail editing
          </caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Thumbnail</span></th>
              <th scope="col">Name</th>
              <th scope="col">Brand</th>
              <th scope="col">Category</th>
              <th scope="col">Price</th>
              <th scope="col">In stock</th>
              <th scope="col">Budtender Select</th>
              <th scope="col"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                categoryLabel={categoryName(product.category)}
                onSetInStock={(inStock) => setInStock(product.id, inStock)}
                onSetPrice={(cents) => setPrice(product.id, cents)}
                onSetStaffPick={(pick) => setStaffPick(product.id, pick)}
                onEdit={() => setEditingId(product.id)}
              />
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className={styles.empty}>No products match &quot;{search}&quot;.</p>}
      </div>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          categories={categories}
          isOpen={editingId !== null}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            const id = editingProduct.id;
            setName(id, patch.name);
            setBrand(id, patch.brand);
            setCategory(id, patch.category);
            if (patch.image !== undefined) setImage(id, patch.image);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

interface RowProps {
  product: Product;
  categoryLabel: string;
  onSetInStock: (inStock: boolean) => void;
  onSetPrice: (priceCents: number) => void;
  onSetStaffPick: (staffPick: boolean) => void;
  onEdit: () => void;
}

function ProductRow({ product, categoryLabel, onSetInStock, onSetPrice, onSetStaffPick, onEdit }: RowProps) {
  const displayed = (product.priceCents / 100).toFixed(2);
  const [priceDraft, setPriceDraft] = useState(displayed);

  const commitPrice = () => {
    const dollars = Number(priceDraft);
    if (priceDraft.trim() === '' || Number.isNaN(dollars) || dollars < 0) {
      setPriceDraft(displayed);
      return;
    }
    setPriceDraft(dollars.toFixed(2));
    onSetPrice(Math.round(dollars * 100));
  };

  const isStaffPick = product.badges.includes('staff-pick');
  const image = product.images[0] ?? null;

  return (
    <tr className={styles.row} data-out-of-stock={!product.inStock}>
      <td className={styles.thumbCell}>
        <div className={styles.thumb}>
          {image ? (
            <Image src={image} alt="" fill sizes="44px" className={styles.thumbImg} />
          ) : (
            <span className={styles.thumbFallback}>{product.brand.charAt(0)}</span>
          )}
        </div>
      </td>
      <td className={styles.nameCell}>
        <span>{product.name}</span>
        {!product.inStock && <span className={styles.outBadge}>Out of stock</span>}
      </td>
      <td className={styles.mutedCell}>{product.brand}</td>
      <td className={styles.mutedCell}>{categoryLabel}</td>
      <td>
        <label className="sr-only" htmlFor={`price-${product.id}`}>Price for {product.name}</label>
        <div className={styles.priceField}>
          <span className={styles.currencyPrefix} aria-hidden="true">$</span>
          <input
            id={`price-${product.id}`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={styles.priceInput}
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </div>
      </td>
      <td>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={product.inStock}
            onChange={(e) => onSetInStock(e.target.checked)}
          />
          <span className="sr-only">{product.inStock ? 'In stock' : 'Out of stock'} — {product.name}</span>
        </label>
      </td>
      <td>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={isStaffPick}
            onChange={(e) => onSetStaffPick(e.target.checked)}
          />
          <span className="sr-only">
            Budtender Select {isStaffPick ? 'enabled' : 'disabled'} — {product.name}
          </span>
        </label>
      </td>
      <td>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          Edit<span className="sr-only"> {product.name}</span>
        </button>
      </td>
    </tr>
  );
}
