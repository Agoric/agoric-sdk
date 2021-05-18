import { Far } from '@agoric/marshal';
import { AssetKind } from '../../../src';

/** @type {Brand} */
export const mockBrand = Far('brand', {
  isMyIssuer: async allegedIssuer => false && allegedIssuer,
  getAllegedName: () => 'mock',
  getDisplayInfo: () => ({
    assetKind: AssetKind.NAT,
  }),
});
