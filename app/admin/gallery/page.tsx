import { AdminGallery } from '@/components/admin/AdminGallery';
import { getCatalogSource } from '@/lib/catalog';

export default async function AdminGalleryPage() {
  const products = await getCatalogSource().listProducts();
  return <AdminGallery products={products} />;
}
