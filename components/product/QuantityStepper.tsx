'use client';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

const buttonStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  width: 34,
  height: 34,
  fontSize: 16,
  cursor: 'pointer',
};

export function QuantityStepper({ value, onChange, min = 1, max = 99 }: Props) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        style={{ ...buttonStyle, opacity: value <= min ? 0.4 : 1, cursor: value <= min ? 'not-allowed' : 'pointer' }}
        aria-label="Decrease quantity"
        aria-disabled={value <= min}
        onClick={() => { if (value > min) onChange(value - 1); }}
      >
        −
      </button>
      <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontSize: 15 }}>{value}</span>
      <button
        type="button"
        style={{ ...buttonStyle, opacity: value >= max ? 0.4 : 1, cursor: value >= max ? 'not-allowed' : 'pointer' }}
        aria-label="Increase quantity"
        aria-disabled={value >= max}
        onClick={() => { if (value < max) onChange(value + 1); }}
      >
        +
      </button>
    </div>
  );
}
