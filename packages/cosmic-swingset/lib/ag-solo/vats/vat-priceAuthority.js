import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeLocalAmountMath } from '@agoric/ertp';

export function buildRootObject(_vatPowers) {
  return harden({
    makePriceAuthority: makePriceAuthorityRegistry,
    async makeFakePriceAuthority(
      issuerIn,
      issuerOut,
      priceList,
      timer,
      quoteInterval = undefined,
    ) {
      const [mathIn, mathOut] = await Promise.all([
        makeLocalAmountMath(issuerIn),
        makeLocalAmountMath(issuerOut),
      ]);
      return makeFakePriceAuthority(
        mathIn,
        mathOut,
        priceList,
        timer,
        quoteInterval,
      );
    },
  });
}
