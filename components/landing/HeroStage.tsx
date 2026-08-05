'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getHeroProducts } from '@/lib/admin';
import type { Product } from '@/lib/catalog/types';
import { LivingCatalogueHero } from './LivingCatalogueHero';

/**
 * Resolves the landing hero's three images against whatever the operator
 * picked on the Gallery admin surface (or the real-catalog default when no
 * pick has been made) before handing them to LivingCatalogueHero. This is
 * the same overlay pattern the storefront already uses for stock/price
 * overrides — the admin edit is live outside of /admin too.
 */
export function HeroStage({ products }: { products: Product[] }) {
  const { heroProductIds } = useAdmin();
  const heroProducts = useMemo(
    () => getHeroProducts(products, heroProductIds),
    [products, heroProductIds],
  );

  return <LivingCatalogueHero products={heroProducts} />;
}
