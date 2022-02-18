import { Far } from '@endo/marshal';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';

/** @type {BuildRootObjectForTestVat} */
export const buildRootObject = _vatPowers =>
  Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options =>
      makeScriptedPriceAuthority(options),
  });
