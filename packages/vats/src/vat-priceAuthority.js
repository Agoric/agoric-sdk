import { Far } from '@agoric/marshal';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority.js';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options => makeFakePriceAuthority(options),
  });
}
