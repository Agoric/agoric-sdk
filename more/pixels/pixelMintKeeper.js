import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';
import { getString } from './types/pixel';

// This custom mintKeeper does the usual recordings of new
// purses/payments and updated balances but it also allows for a
// special capability to destroy units: effectively remove pixels
// from the purses or payments they were in. In order to do that, we
// must continuously record every movement of a pixel to a new purse
// or payment. We need this functionality in order to have the ability to revoke
// childPayments/childPurses
export function makePixelMintKeeper(unitOps) {
  // individual pixel to purse/payment
  const pixelToAsset = new Map();

  // This helper function takes a units, takes out the pixelList within it,
  // and makes sure that the mapping of each pixel to asset is updated.
  function recordPixelsAsAsset(pixelUnits, asset) {
    pixelUnits = unitOps.coerce(pixelUnits);
    const pixelList = unitOps.extent(pixelUnits);
    for (const pixel of pixelList) {
      pixelToAsset.set(getString(pixel), asset);
    }
  }

  function deletePixelToAssetMapping(pixelUnits) {
    pixelUnits = unitOps.coerce(pixelUnits);
    const pixelList = unitOps.extent(pixelUnits);
    for (const pixel of pixelList) {
      pixelToAsset.delete(getString(pixel));
    }
  }

  function makeAssetKeeper() {
    // assetHolder to units
    const assetHolderToBalance = makePrivateName();
    return harden({
      // updateUnits and recordNew are the same as the core
      // mintKeeper, except that we also record the movement of the
      // pixels when they are called.
      updateUnits(assetHolder, newUnits) {
        assetHolderToBalance.set(assetHolder, newUnits);
        recordPixelsAsAsset(newUnits, assetHolder);
      },
      recordNew(assetHolder, initialUnits) {
        assetHolderToBalance.init(assetHolder, initialUnits);
        recordPixelsAsAsset(initialUnits, assetHolder);
      },
      getUnits(assetHolder) {
        return assetHolderToBalance.get(assetHolder);
      },
      has(assetHolder) {
        return assetHolderToBalance.has(assetHolder);
      },
      remove(assetHolder) {
        const pixelUnits = assetHolderToBalance.get(assetHolder);
        assetHolderToBalance.delete(assetHolder);
        // the pixels will be remapped in a later step, but let's
        // delete the map here as well to be safe
        deletePixelToAssetMapping(pixelUnits);
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

    // This units containing a pixelList of uniquely identifiable
    // pixels will be forcibly taken out of all purses and payments
    // that it is currently in. Destroy is outside of an assetKeeper
    // because it could affect purses *or* payments
    destroy(removePixelUnits) {
      removePixelUnits = unitOps.coerce(removePixelUnits);
      const pixelList = unitOps.extent(removePixelUnits);
      pixelList.forEach(pixel => {
        const strPixel = getString(pixel);
        if (pixelToAsset.has(strPixel)) {
          const asset = pixelToAsset.get(strPixel);
          const keeper = getKeeper(asset);
          const originalUnits = keeper.getUnits(asset);
          const newUnits = unitOps.without(
            originalUnits,
            unitOps.make(harden([pixel])),
          );

          // ///////////////// commit point //////////////////
          // All queries above passed with no side effects.
          // During side effects below, any early exits should be made into
          // fatal turn aborts.
          keeper.updateUnits(asset, newUnits);

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
