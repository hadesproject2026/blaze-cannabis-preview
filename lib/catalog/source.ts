import type { Category, Product, Store } from './types';

export interface CatalogSource {
  listProducts(): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  getStore(id: string): Promise<Store | null>;
}
