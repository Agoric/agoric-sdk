import { Far } from '@agoric/marshal';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    async makeFakePriceAuthority(options) {
      return makeFakePriceAuthority({ ...options });
    },
  });
}
