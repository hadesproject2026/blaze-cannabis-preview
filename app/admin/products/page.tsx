import { AdminProductsTable } from '@/components/admin/AdminProductsTable';
import { getCatalogSource } from '@/lib/catalog';

export default async function AdminProductsPage() {
  const source = getCatalogSource();
  const [products, categories] = await Promise.all([source.listProducts(), source.listCategories()]);

  return <AdminProductsTable products={products} categories={categories} />;
}
