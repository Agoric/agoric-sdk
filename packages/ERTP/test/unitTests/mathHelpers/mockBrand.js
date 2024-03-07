import { Far } from '@endo/marshal';
import { AssetKind } from '../../../src/index.js';

/** @type {Brand<AssetKind>} */
export const mockBrand = makeExo(
  'brand',
  M.interface('brand', {}, { defaultGuards: 'passable' }),
  {
    // eslint-disable-next-line no-unused-vars
    isMyIssuer: async allegedIssuer => false,
    getAllegedName: () => 'mock',
    getAmountShape: () => {},
    getDisplayInfo: () => ({
      assetKind: AssetKind.NAT,
    }),
  },
);
