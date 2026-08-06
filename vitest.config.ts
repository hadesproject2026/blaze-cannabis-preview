import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Every component in this codebase relies on the automatic JSX runtime (matching
  // how Next's SWC compiles them for the real app — no component imports React
  // itself). Without this, Vite's default esbuild JSX transform is classic mode,
  // which needs `React` in scope and throws "React is not defined" for any
  // component-rendering test. Not needed until this phase, since no prior test
  // rendered a component with React Testing Library.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
