import { makePrivateName } from '../util/PrivateName';

export function makeBasicMintController() {
  // An asset can either be a purse or payment. An asset controller
  // keeps track of either all of the purses (purseController) or all
  // of the payments (paymentController).
  function makeAssetController(type) {
    // asset to amount
    let assets = makePrivateName();
    return {
      updateAmount(asset, newAmount) {
        assets.set(asset, newAmount);
      },
      recordNew(asset, initialAmount) {
        assets.init(asset, initialAmount);
      },
      getAmount(asset) {
        return assets.get(asset);
      },
      getType() {
        return `${type}`;
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

  const mintController = {
    purseController,
    paymentController,
    // destroy is outside of an assetController because it could affect
    // purses or payments
    destroy(_amount) {
      throw new Error('destroy is not implemented');
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
