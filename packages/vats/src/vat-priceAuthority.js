import { Far } from '@endo/far';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority.js';

export function buildRootObject() {
  return Far('root', {
    makePriceAuthorityRegistry,
    makeFakePriceAuthority: async options => makeFakePriceAuthority(options),
  });
}
