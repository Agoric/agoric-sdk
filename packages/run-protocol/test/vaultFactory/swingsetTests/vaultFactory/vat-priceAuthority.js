import { Far } from '@endo/marshal';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority';

import '@agoric/swingset-vat/src/kernel/vatManager/types.js';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject() {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options =>
      makeScriptedPriceAuthority(options),
  });
}
