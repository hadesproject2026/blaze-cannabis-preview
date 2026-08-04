import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

const REQUIRED = {
  '--bg': '#08090C',
  '--surface': '#111319',
  '--surface-2': '#171A22',
  '--border': '#20242F',
  '--border-strong': '#2A3040',
  '--text': '#ECEEF2',
  '--text-muted': '#7A8094',
  '--accent': '#34D399',
  '--accent-press': '#22B87F',
  '--gold': '#C8B78A',
  '--danger': '#F87171',
  '--spot-yellow': '#FFE000',
};

describe('Nocturne design tokens', () => {
  for (const [token, value] of Object.entries(REQUIRED)) {
    it(`defines ${token} as ${value}`, () => {
      expect(css).toContain(`${token}: ${value}`);
    });
  }

  it('defines the motion duration tokens', () => {
    expect(css).toContain('--dur-fast: 150ms');
    expect(css).toContain('--dur: 280ms');
    expect(css).toContain('--dur-slow: 600ms');
  });

  it('disables ambient motion under prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('self-hosts both fonts and references no font CDN', () => {
    expect(css).toContain("url('/fonts/fraunces-var-latin.woff2')");
    expect(css).toContain("url('/fonts/inter-var-latin.woff2')");
    expect(css).not.toContain('fonts.googleapis.com');
    expect(css).not.toContain('fonts.gstatic.com');
  });

  it('points the font tokens at the self-hosted families', () => {
    expect(css).toContain("--font-display: 'Fraunces'");
    expect(css).toContain("--font-ui: 'Inter'");
  });
});
