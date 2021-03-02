import { Far } from '@agoric/marshal';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeLocalAmountMath } from '@agoric/ertp';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    makePriceAuthority: makePriceAuthorityRegistry,
    async makeFakePriceAuthority(options) {
      const { issuerIn, issuerOut } = options;
      const [mathIn, mathOut] = await Promise.all([
        makeLocalAmountMath(issuerIn),
        makeLocalAmountMath(issuerOut),
      ]);
      return makeFakePriceAuthority({ ...options, mathIn, mathOut });
    },
  });
}
