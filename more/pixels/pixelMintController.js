import { makePrivateName } from '../../util/PrivateName';
import { insist } from '../../util/insist';

import { getString } from './types/pixel';

export function makeMintController(assay) {
  // Map from purse or payment to the rights it currently
  // holds. Rights can move via payments

  // pixel to purse/payment
  const pixelToAsset = new Map();

  function recordPixelsAsAsset(amount, asset) {
    // purse or payment is the key of rights
    amount = assay.coerce(amount);
    const pixelList = assay.quantity(amount);
    for (const pixel of pixelList) {
      pixelToAsset.set(getString(pixel), asset);
    }
  }

  function makeAssetController() {
    // asset to amount
    let assets = makePrivateName();
    return {
      updateAmount(asset, newAmount) {
        assets.set(asset, newAmount);
        recordPixelsAsAsset(newAmount, asset);
      },
      recordNew(asset, initialAmount) {
        assets.init(asset, initialAmount);
        recordPixelsAsAsset(initialAmount, asset);
      },
      getAmount(asset) {
        return assets.get(asset);
      },
      has(asset) {
        return assets.has(asset);
      },
      destroyAll() {
        assets = makePrivateName(); // reset completely
      },
    };
  }

  const purseController = makeAssetController('purse');
  const paymentController = makeAssetController('payment');

  function getController(asset) {
    if (purseController.has(asset)) {
      return purseController;
    }
    if (paymentController.has(asset)) {
      return paymentController;
    }
    throw new Error(
      `asset ${asset.getName()} was not recognized as a purse or a payment`,
    );
  }

  const mintController = {
    purseController,
    paymentController,

    // This amount (must be nonfungible) will be forcibly taken out of
    // all purses and payments that it is currently in. Destroy is
    // outside of an assetController because it could affect purses or
    // payments
    destroy(amount) {
      // amount must only contain one pixel
      const pixelList = assay.quantity(amount);
      insist(pixelList.length === 1)`amount must contain exactly one pixel`;

      const pixel = pixelList[0];
      const strPixel = getString(pixel);
      insist(
        pixelToAsset.has(strPixel),
      )`pixel ${strPixel} could not be found to be destroyed`;
      const asset = pixelToAsset.get(strPixel);
      // amount is guaranteed to be there
      amount = assay.coerce(amount);

      const controller = getController(asset);
      const originalAmount = controller.getAmount(asset);
      const newAmount = assay.without(originalAmount, amount);

      // ///////////////// commit point //////////////////
      // All queries above passed with no side effects.
      // During side effects below, any early exits should be made into
      // fatal turn aborts.
      controller.updateAmount(asset, newAmount);
      // Reset the mappings from everything in the amount to the purse
      // or payment that holds them.
      recordPixelsAsAsset(newAmount, asset);

      // delete pixel from pixelToAsset
      pixelToAsset.delete(pixel);
    },
    isPurse(asset) {
      return purseController.has(asset);
    },
    isPayment(asset) {
      return paymentController.has(asset);
    },
  };
  return mintController;
}
