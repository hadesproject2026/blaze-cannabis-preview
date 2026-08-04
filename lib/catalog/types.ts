export type StrainType = 'indica-dominant' | 'sativa-dominant' | 'hybrid' | 'cbd';
export type PotencyUnit = '%' | 'mg/g';
export type ProductBadge = 'new-drop' | 'staff-pick' | 'on-sale';

export interface PotencyRange {
  min: number;
  max: number;
  unit: PotencyUnit;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  strainType: StrainType | null;
  thc: PotencyRange | null;
  cbd: PotencyRange | null;
  size: string;
  priceCents: number;
  salePriceCents: number | null;
  inStock: boolean;
  images: string[];
  description: string;
  terpenes: string[];
  effects: string[];
  badges: ProductBadge[];
  addedAt: string;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
}

export interface StoreHours {
  day: string;
  open: string;
  close: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  hours: StoreHours[];
}
