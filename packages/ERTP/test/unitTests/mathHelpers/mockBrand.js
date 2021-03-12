import { Far } from '@agoric/marshal';

export const mockBrand = Far('brand', {
  isMyIssuer: async () => false,
  getAllegedName: () => 'mock',
  getDisplayInfo: () => ({}),
});
