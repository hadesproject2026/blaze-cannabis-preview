import { LivingCatalogueHero } from '@/components/landing/LivingCatalogueHero';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export default async function LandingPage() {
  const products = await getCatalogSource().listProducts();
  const featured = products.filter((p) => p.images.length > 0).slice(0, 3);

  return (
    <>
      <SiteHeader />
      <LivingCatalogueHero products={featured} />
    </>
  );
}
