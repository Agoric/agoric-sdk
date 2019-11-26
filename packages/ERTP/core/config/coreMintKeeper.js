import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';

export function makeCoreMintKeeper() {
  // An asset can either be a purse or payment. An asset keeper
  // keeps track of either all of the purses (purseKeeper) or all
  // of the payments (paymentKeeper) and their respective units.
  function makeAssetKeeper() {
    // asset to units
    const units = makePrivateName();
    return harden({
      updateUnits(asset, newUnits) {
        units.set(asset, newUnits);
      },
      recordNew(asset, initialUnits) {
        units.init(asset, initialUnits);
      },
      getUnits(asset) {
        return units.get(asset);
      },
      has(asset) {
        return units.has(asset);
      },
      remove(asset) {
        units.delete(asset);
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
