import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';
import { getString } from './types/pixel';

// This custom mintKeeper does the usual recordings of new
// purses/payments and updated balances but it also allows for a
// special capability to destroy assetDescs: effectively remove pixels
// from the purses or payments they were in. In order to do that, we
// must continuously record every movement of a pixel to a new purse
// or payment. We need this functionality in order to have the ability to revoke
// childPayments/childPurses
export function makePixelMintKeeper(assetDescOps) {
  // individual pixel to purse/payment
  const pixelToAsset = new Map();

  // This helper function takes an assetDesc, takes out the pixelList within it,
  // and makes sure that the mapping of each pixel to asset is updated.
  function recordPixelsAsAsset(assetDesc, asset) {
    assetDesc = assetDescOps.coerce(assetDesc);
    const pixelList = assetDescOps.extent(assetDesc);
    for (const pixel of pixelList) {
      pixelToAsset.set(getString(pixel), asset);
    }
  }

  function deletePixelToAssetMapping(assetDesc) {
    assetDesc = assetDescOps.coerce(assetDesc);
    const pixelList = assetDescOps.extent(assetDesc);
    for (const pixel of pixelList) {
      pixelToAsset.delete(getString(pixel));
    }
  }

  function makeAssetKeeper() {
    // asset to assetDesc
    const assetDescs = makePrivateName();
    return harden({
      // updateAssetDesc and recordNew are the same as the core
      // mintKeeper, except that we also record the movement of the
      // pixels when they are called.
      updateAssetDesc(asset, newAssetDesc) {
        assetDescs.set(asset, newAssetDesc);
        recordPixelsAsAsset(newAssetDesc, asset);
      },
      recordNew(asset, initialAssetDesc) {
        assetDescs.init(asset, initialAssetDesc);
        recordPixelsAsAsset(initialAssetDesc, asset);
      },
      getAssetDesc(asset) {
        return assetDescs.get(asset);
      },
      has(asset) {
        return assetDescs.has(asset);
      },
      remove(asset) {
        const assetDesc = assetDescs.get(asset);
        assetDescs.delete(asset);
        // the pixels will be remapped in a later step, but let's
        // delete the map here as well to be safe
        deletePixelToAssetMapping(assetDesc);
      },
    });
  }

  const purseKeeper = makeAssetKeeper('purse');
  const paymentKeeper = makeAssetKeeper('payment');

  // This helper function is used by `destroy` to find the keeper
  // associated with the asset, when we retrieved the asset from the
  // `pixelToAsset` map and we don't yet know whether the asset
  // is a purse or payment
  function getKeeper(asset) {
    if (purseKeeper.has(asset)) {
      return purseKeeper;
    }
    if (paymentKeeper.has(asset)) {
      return paymentKeeper;
    }
    throw new Error(
      `asset ${asset.getName()} was not recognized as a purse or a payment`,
    );
  }

  const pixelMintKeeper = harden({
    purseKeeper,
    paymentKeeper,

    // This assetDesc containing a pixelList of uniquely identifiable
    // pixels will be forcibly taken out of all purses and payments
    // that it is currently in. Destroy is outside of an assetKeeper
    // because it could affect purses *or* payments
    destroy(removePixelAssetDesc) {
      removePixelAssetDesc = assetDescOps.coerce(removePixelAssetDesc);
      const pixelList = assetDescOps.extent(removePixelAssetDesc);
      pixelList.forEach(pixel => {
        const strPixel = getString(pixel);
        if (pixelToAsset.has(strPixel)) {
          const asset = pixelToAsset.get(strPixel);
          const keeper = getKeeper(asset);
          const originalAssetDesc = keeper.getAssetDesc(asset);
          const newAssetDesc = assetDescOps.without(
            originalAssetDesc,
            assetDescOps.make(harden([pixel])),
          );

          // ///////////////// commit point //////////////////
          // All queries above passed with no side effects.
          // During side effects below, any early exits should be made into
          // fatal turn aborts.
          keeper.updateAssetDesc(asset, newAssetDesc);

          // delete pixel from pixelToAsset
          pixelToAsset.delete(pixel);
        }
      });
    },
    isPurse(asset) {
      return purseKeeper.has(asset);
    },
    isPayment(asset) {
      return paymentKeeper.has(asset);
    },
  });
  return pixelMintKeeper;
}
