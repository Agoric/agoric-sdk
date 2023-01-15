import { Far } from '@endo/far';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject() {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options =>
      makeScriptedPriceAuthority(options),
  });
}
