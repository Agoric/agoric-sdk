import { makePrivateName } from '../../util/PrivateName';

import { getString } from './types/pixel';

export function makeMintController(assay) {
  // Map from purse or payment to the rights it currently
  // holds. Rights can move via payments

  // purse/payment to amount
  let rights = makePrivateName();

  // pixel to purse/payment
  const pixelToPursePayment = new Map();

  function setLocation(amount, pursePayment) {
    // purse/payment is the key of rights
    amount = assay.coerce(amount);
    const pixelList = assay.quantity(amount);
    for (const pixel of pixelList) {
      pixelToPursePayment.set(getString(pixel), pursePayment);
    }
  }

  function destroy(amount) {
    // amount must only contain one pixel
    const pixelList = assay.quantity(amount);
    // assume length === 1 for now

    const pixel = pixelList[0];
    const location = pixelToPursePayment.get(getString(pixel));
    // amount is guaranteed to be there
    // eslint-disable-next-line no-use-before-define
    amount = assay.coerce(amount);
    const srcOldRightsAmount = rights.get(location);
    // eslint-disable-next-line no-use-before-define
    const srcNewRightsAmount = assay.without(srcOldRightsAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.

    rights.set(location, srcNewRightsAmount);
    setLocation(srcNewRightsAmount, location);

    // delete pixel from pixelToPursePayment
    pixelToPursePayment.delete(pixel);
  }

  function destroyAll() {
    rights = makePrivateName(); // reset rights
  }

  function recordPayment(src, payment, amount, srcNewRightsAmount) {
    rights.set(src, srcNewRightsAmount);
    setLocation(srcNewRightsAmount, src);
    rights.init(payment, amount);
    setLocation(amount, payment);
  }

  function recordDeposit(
    srcPayment,
    srcNewRightsAmount,
    purse,
    purseNewRightsAmount,
  ) {
    rights.set(srcPayment, srcNewRightsAmount);
    setLocation(srcNewRightsAmount, srcPayment);
    rights.set(purse, purseNewRightsAmount);
    setLocation(purseNewRightsAmount, purse);
  }

  function recordMint(purse, initialAmount) {
    rights.init(purse, initialAmount);
    setLocation(initialAmount, purse);
  }

  function getAmount(pursePayment) {
    return rights.get(pursePayment);
  }

  const mintController = {
    destroy,
    destroyAll,
    recordPayment,
    recordDeposit,
    recordMint,
    getAmount,
  };
  return mintController;
}
