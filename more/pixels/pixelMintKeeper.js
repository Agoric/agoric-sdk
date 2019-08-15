import harden from '@agoric/harden';

import { makePrivateName } from '../../util/PrivateName';
import { getString } from './types/pixel';

// This custom mintKeeper does the usual recordings of new
// purses/payments and updated balances but it also allows for a
// special capability to destroy amounts: effectively remove pixels
// from the purses or payments they were in. In order to do that, we
// must continuously record every movement of a pixel to a new purse
// or payment. We need this functionality in order to have the ability to revoke
// childPayments/childPurses
export function makePixelMintKeeper(assay) {
  // individual pixel to purse/payment
  const pixelToAsset = new Map();

  // This helper function takes an amount, takes out the pixelList within it,
  // and makes sure that the mapping of each pixel to asset is updated.
  function recordPixelsAsAsset(amount, asset) {
    amount = assay.coerce(amount);
    const pixelList = assay.quantity(amount);
    for (const pixel of pixelList) {
      pixelToAsset.set(getString(pixel), asset);
    }
  }

  function makeAssetKeeper() {
    // asset to amount
    const amounts = makePrivateName();
    return harden({
      // updateAmount and recordNew are the same as the core
      // mintKeeper, except that we also record the movement of the
      // pixels when they are called.
      updateAmount(asset, newAmount) {
        amounts.set(asset, newAmount);
        recordPixelsAsAsset(newAmount, asset);
      },
      recordNew(asset, initialAmount) {
        amounts.init(asset, initialAmount);
        recordPixelsAsAsset(initialAmount, asset);
      },
      getAmount(asset) {
        return amounts.get(asset);
      },
      has(asset) {
        return amounts.has(asset);
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

    // This amount containing a pixelList of uniquely identifiable
    // pixels will be forcibly taken out of all purses and payments
    // that it is currently in. Destroy is outside of an assetKeeper
    // because it could affect purses *or* payments
    destroy(removePixelAmount) {
      removePixelAmount = assay.coerce(removePixelAmount);
      const pixelList = assay.quantity(removePixelAmount);
      pixelList.forEach(pixel => {
        const strPixel = getString(pixel);
        if (pixelToAsset.has(strPixel)) {
          const asset = pixelToAsset.get(strPixel);
          const keeper = getKeeper(asset);
          const originalAmount = keeper.getAmount(asset);
          const newAmount = assay.without(
            originalAmount,
            assay.make(harden([pixel])),
          );

          // ///////////////// commit point //////////////////
          // All queries above passed with no side effects.
          // During side effects below, any early exits should be made into
          // fatal turn aborts.
          keeper.updateAmount(asset, newAmount);

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
