import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';

export function makeCoreMintKeeper() {
  // An asset can either be a purse or payment. An asset keeper
  // keeps track of either all of the purses (purseKeeper) or all
  // of the payments (paymentKeeper) and their respective assetDescs.
  function makeAssetKeeper() {
    // asset to assetDesc
    const assetDescs = makePrivateName();
    return harden({
      updateAssetDesc(asset, newAssetDesc) {
        assetDescs.set(asset, newAssetDesc);
      },
      recordNew(asset, initialAssetDesc) {
        assetDescs.init(asset, initialAssetDesc);
      },
      getAssetDesc(asset) {
        return assetDescs.get(asset);
      },
      has(asset) {
        return assetDescs.has(asset);
      },
      remove(asset) {
        assetDescs.delete(asset);
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
