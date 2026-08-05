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
        style={buttonStyle}
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontSize: 15 }}>{value}</span>
      <button
        type="button"
        style={buttonStyle}
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
