import { MockCatalogSource } from './mock-source';
import type { CatalogSource } from './source';

let cached: CatalogSource | null = null;

export function getCatalogSource(): CatalogSource {
  if (!cached) cached = new MockCatalogSource();
  return cached;
}

export type { CatalogSource } from './source';
export * from './types';
