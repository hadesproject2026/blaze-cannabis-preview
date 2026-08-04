import { MockCatalogSource } from '@/lib/catalog/mock-source';
import { runCatalogSourceContract } from './catalog-source.contract';

runCatalogSourceContract('MockCatalogSource', () => new MockCatalogSource(), {
  knownStoreId: 'brampton',
});
