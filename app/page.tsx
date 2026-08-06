import { BudtenderRail } from '@/components/landing/BudtenderRail';
import { CategoryQuickGrid } from '@/components/landing/CategoryQuickGrid';
import { SmokeHero } from '@/components/landing/SmokeHero';
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
        {/* The hero is now the client's own JUST BLAZE artwork behind drifting
            smoke, rather than floating product cut-outs. Their catalogue photos
            sit on white backgrounds, which read as postage stamps on a dark
            card — the reason that approach was dropped. Note this leaves the
            admin Gallery picker driving nothing; see the README. */}
        <SmokeHero />
        <CategoryQuickGrid categories={categories} />
        <BudtenderRail products={picks} />
        {store && <StoreBlock store={store} />}
      </main>
      <SiteFooter />
    </>
  );
}
