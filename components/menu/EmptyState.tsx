export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 20px' }}>
      <p className="kicker">Nothing on the shelf</p>
      <h3 style={{ fontSize: 24, margin: '10px 0 8px' }}>No products match those filters</h3>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Try widening the price or THC range, or clear everything and start again.
      </p>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'transparent',
          color: 'var(--text)',
          border: '1px solid var(--border-strong)',
          borderRadius: 999,
          padding: '11px 22px',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Clear all filters
      </button>
    </div>
  );
}
