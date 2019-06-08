import { makePrivateName } from '../util/PrivateName';

export function makeBasicMintController() {
  // Map from purse or payment to the rights it currently
  // holds. Rights can move via payments

  // purse/payment to amount
  let rights = makePrivateName();

  function recordPayment(src, payment, amount, srcNewRightsAmount) {
    rights.set(src, srcNewRightsAmount);
    rights.init(payment, amount);
  }

  function destroy(_amount) {
    throw new Error('destroy is not implemented');
  }

  function destroyAll() {
    rights = makePrivateName(); // reset rights
  }

  function recordDeposit(
    srcPayment,
    srcNewRightsAmount,
    purse,
    purseNewRightsAmount,
  ) {
    rights.set(srcPayment, srcNewRightsAmount);
    rights.set(purse, purseNewRightsAmount);
  }

  function recordMint(purse, initialAmount) {
    rights.init(purse, initialAmount);
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
