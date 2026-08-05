import { notFound } from 'next/navigation';
import { BrandRail } from '@/components/product/BrandRail';
import { ProductDetail } from '@/components/product/ProductDetail';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getCatalogSource } from '@/lib/catalog';

export async function generateStaticParams() {
  const products = await getCatalogSource().listProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getCatalogSource().getProduct(params.slug);
  return { title: product ? `${product.name} — Blaze Cannabis` : 'Not found — Blaze Cannabis' };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const source = getCatalogSource();
  const product = await source.getProduct(params.slug);
  if (!product) notFound();

  const all = await source.listProducts();
  const related = all
    .filter((p) => p.brand === product.brand && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main>
        <ProductDetail product={product} />
        <BrandRail brand={product.brand} products={related} />
      </main>
      <SiteFooter />
    </>
  );
}
