import { BudtenderRail } from '@/components/landing/BudtenderRail';
import { CategoryQuickGrid } from '@/components/landing/CategoryQuickGrid';
import { LivingCatalogueHero } from '@/components/landing/LivingCatalogueHero';
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

  const heroProducts = products.filter((p) => p.images.length > 0).slice(0, 3);
  const picks = products.filter((p) => p.badges.includes('staff-pick')).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main>
        <LivingCatalogueHero products={heroProducts} />
        <CategoryQuickGrid categories={categories} />
        <BudtenderRail products={picks} />
        {store && <StoreBlock store={store} />}
      </main>
      <SiteFooter />
    </>
  );
}
