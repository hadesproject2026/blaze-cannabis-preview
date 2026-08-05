import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { getCatalogSource } from '@/lib/catalog';
import { applyView, parseView, VIEW_LABELS } from '@/lib/catalog/views';

export const metadata = {
  title: 'Menu — Blaze Cannabis Brampton',
};

interface Props {
  searchParams?: { view?: string | string[] };
}

export default async function MenuPage({ searchParams }: Props) {
  const source = getCatalogSource();
  const [products, categories] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
  ]);

  const view = parseView(searchParams?.view);
  const visibleProducts = applyView(products, view);
  const viewLabel = view ? VIEW_LABELS[view] : null;

  return (
    <>
      <MenuBrowser products={visibleProducts} categories={categories} viewLabel={viewLabel} />
      <SiteFooter />
    </>
  );
}
