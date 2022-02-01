import { Far } from '@endo/marshal';
import { AssetKind } from '../../../src/index.js';

/** @type {Brand} */
export const mockBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getDisplayInfo: () => ({
    assetKind: AssetKind.NAT,
  }),
});
