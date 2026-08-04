import type { CatalogSource } from './source';
import type { Category, Product, Store } from './types';
import catalog from '@/data/catalog.json';

interface CatalogFile {
  store: Store;
  categories: Category[];
  products: Product[];
}

const data = catalog as unknown as CatalogFile;

export class MockCatalogSource implements CatalogSource {
  async listProducts(): Promise<Product[]> {
    return data.products;
  }

  async getProduct(slug: string): Promise<Product | null> {
    return data.products.find((p) => p.slug === slug) ?? null;
  }

  async listCategories(): Promise<Category[]> {
    return data.categories;
  }

  async getStore(id: string): Promise<Store | null> {
    return data.store.id === id ? data.store : null;
  }
}
