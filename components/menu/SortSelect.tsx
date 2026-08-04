'use client';

import { SORT_OPTIONS, type SortKey } from '@/lib/filters';

interface Props {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortSelect({ value, onChange }: Props) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
      Sort
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '8px 14px',
          fontSize: 13,
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
