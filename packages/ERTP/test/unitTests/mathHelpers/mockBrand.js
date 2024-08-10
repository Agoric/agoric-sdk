import { Far } from '@endo/marshal';
import { AssetKind } from '../../../src/index.js';

/** @import {Brand} from '@agoric/ertp/src/types.js'; */

/** @type {Brand<'nat'>} */
// @ts-expect-error FIXME losing PASS_STYLE
export const mockNatBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getAmountShape: () => ({}),
  getDisplayInfo: () => ({
    assetKind: AssetKind.NAT,
  }),
});

/** @type {Brand<'set'>} */
// @ts-expect-error FIXME losing PASS_STYLE
export const mockSetBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getAmountShape: () => ({}),
  getDisplayInfo: () => ({
    assetKind: AssetKind.SET,
  }),
});

/** @type {Brand<'copySet'>} */
// @ts-expect-error FIXME losing PASS_STYLE
export const mockCopySetBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getAmountShape: () => ({}),
  getDisplayInfo: () => ({
    assetKind: AssetKind.COPY_SET,
  }),
});

/** @type {Brand<'copyBag'>} */
// @ts-expect-error FIXME losing PASS_STYLE
export const mockCopyBagBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getAmountShape: () => ({}),
  getDisplayInfo: () => ({
    assetKind: AssetKind.COPY_BAG,
  }),
});
