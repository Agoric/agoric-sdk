import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry';

export function buildRootObject(_vatPowers) {
  return harden({
    makePriceAuthority: makePriceAuthorityRegistry,
  });
}
