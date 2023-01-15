import { Far } from '@endo/far';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject() {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options =>
      makeScriptedPriceAuthority(options),
  });
}
