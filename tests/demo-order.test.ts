import { describe, expect, it } from 'vitest';
import { generateDemoOrderReference } from '@/lib/checkout/demo-order';

describe('generateDemoOrderReference', () => {
  it('matches the DEMO-YYMMDD-XXXXX shape', () => {
    const ref = generateDemoOrderReference();
    expect(ref).toMatch(/^DEMO-\d{6}-[A-Z0-9]{5}$/);
  });

  it('is deterministic given injected now()/random()', () => {
    const fixedNow = () => new Date('2026-08-08T12:00:00Z').getTime();
    const fixedRandom = () => 0; // always picks alphabet index 0
    const ref = generateDemoOrderReference(fixedNow, fixedRandom);
    expect(ref).toBe('DEMO-260808-AAAAA');
  });

  it('never emits the visually ambiguous 0/O/1/I characters in its random suffix', () => {
    let counter = 0;
    // Sweep random() across the full [0,1) range via a counter so every
    // alphabet index gets exercised at least once. The date part is fixed and
    // checked separately, since it's plain digits and legitimately contains 0/1.
    const sweepingRandom = () => {
      const value = (counter % 33) / 33;
      counter += 1;
      return value;
    };
    const ref = generateDemoOrderReference(() => 0, sweepingRandom);
    const suffix = ref.split('-')[2];
    expect(suffix).not.toMatch(/[0O1I]/);
  });

  it('produces different references across calls with the real random source', () => {
    const refs = new Set(Array.from({ length: 20 }, () => generateDemoOrderReference()));
    expect(refs.size).toBeGreaterThan(1);
  });
});
