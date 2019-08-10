import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';

export function makeCoreMintKeeper() {
  // An asset can either be a purse or payment. An asset keeper
  // keeps track of either all of the purses (purseKeeper) or all
  // of the payments (paymentKeeper) and their respective amounts.
  function makeAssetKeeper() {
    // asset to amount
    const amounts = makePrivateName();
    return harden({
      updateAmount(asset, newAmount) {
        amounts.set(asset, newAmount);
      },
      recordNew(asset, initialAmount) {
        amounts.init(asset, initialAmount);
      },
      getAmount(asset) {
        return amounts.get(asset);
      },
      has(asset) {
        return amounts.has(asset);
      },
    });
  }

  const purseKeeper = makeAssetKeeper();
  const paymentKeeper = makeAssetKeeper();

  const mintKeeper = harden({
    purseKeeper,
    paymentKeeper,
    isPurse(asset) {
      return purseKeeper.has(asset);
    },
    isPayment(asset) {
      return paymentKeeper.has(asset);
    },
  });
  return mintKeeper;
}
