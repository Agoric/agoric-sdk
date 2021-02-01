import { E } from '@agoric/eventual-send';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';

export function buildRootObject(_vatPowers) {
  return harden({
    makePriceAuthority: makePriceAuthorityRegistry,
    async makeFakePriceAuthority(options) {
      const { issuerIn, issuerOut } = options;
      const [mathIn, mathOut] = await Promise.all([
        E(issuerIn).getBrand(),
        E(issuerOut).getBrand(),
      ]);
      return makeFakePriceAuthority({ ...options, mathIn, mathOut });
    },
  });
}
