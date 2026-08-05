import { BudtenderRail } from '@/components/landing/BudtenderRail';
import { CategoryQuickGrid } from '@/components/landing/CategoryQuickGrid';
import { HeroStage } from '@/components/landing/HeroStage';
import { StoreBlock } from '@/components/landing/StoreBlock';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export default async function LandingPage() {
  const source = getCatalogSource();
  const [products, categories, store] = await Promise.all([
    source.listProducts(),
    source.listCategories(),
    source.getStore('brampton'),
  ]);

  const picks = products.filter((p) => p.badges.includes('staff-pick')).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main>
        {/* The operator's Gallery picks (admin) resolve here, client-side, so
            the hero stays live even though this page renders on the server. */}
        <HeroStage products={products} />
        <CategoryQuickGrid categories={categories} />
        <BudtenderRail products={picks} />
        {store && <StoreBlock store={store} />}
      </main>
      <SiteFooter />
    </>
  );
}
