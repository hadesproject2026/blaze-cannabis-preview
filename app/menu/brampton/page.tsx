import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { getCatalogSource } from '@/lib/catalog';

export const metadata = {
  title: 'Menu — Blaze Cannabis Brampton',
};

export default async function MenuPage() {
  const source = getCatalogSource();
  const [products, categories] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
  ]);

  return (
    <>
      <MenuBrowser products={products} categories={categories} />
      <SiteFooter />
    </>
  );
}
