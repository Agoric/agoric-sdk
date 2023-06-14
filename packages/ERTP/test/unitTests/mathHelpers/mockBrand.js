import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { AssetKind } from '../../../src/index.js';

const mockAuxData = harden({
  name: 'mock',
  assetKind: AssetKind.NAT,
  displayInfo: { assetKind: AssetKind.NAT },
  amountShape: M.any(),
});

/** @type {Brand<AssetKind>} */
export const mockBrand = Far('brand', {
  getAllegedName: () => mockAuxData.name,
  isMyIssuer: async _allegedIssuer => false,
  getDisplayInfo: () => mockAuxData.displayInfo,
  getAmountShape: () => mockAuxData.amountShape,
  aux: () => mockAuxData,
});
