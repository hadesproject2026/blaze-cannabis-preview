import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getCatalogSource } from '@/lib/catalog';
import { generateSampleEarnings } from '@/lib/sample-earnings';

export default async function AdminDashboardPage() {
  const source = getCatalogSource();
  const [products, categories, store] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
    source.getStore('brampton'),
  ]);
  const earnings = generateSampleEarnings(products);

  return <AdminDashboard products={products} categories={categories} store={store} earnings={earnings} />;
}
