import { makeNotifierKit } from '@agoric/notifier';
import { Far } from '@agoric/marshal';
import { AmountMath } from './amountMath.js';

export const makePurse = (allegedName, assetKind, brand, purseMethods) => {
  let currentBalance = AmountMath.makeEmpty(brand, assetKind);

  /** @type {NotifierRecord<Amount>} */
  const {
    notifier: balanceNotifier,
    updater: balanceUpdater,
  } = makeNotifierKit(currentBalance);

  const updatePurseBalance = newPurseBalance => {
    currentBalance = newPurseBalance;
    balanceUpdater.updateState(currentBalance);
  };

  /** @type {Purse} */
  const purse = Far(`${allegedName} purse`, {
    deposit: (srcPayment, optAmountPattern = undefined) => {
      // Note COMMIT POINT within deposit.
      return purseMethods.deposit(
        currentBalance,
        updatePurseBalance,
        srcPayment,
        optAmountPattern,
      );
    },
    withdraw: amount =>
      // Note COMMIT POINT within withdraw.
      purseMethods.withdraw(currentBalance, updatePurseBalance, amount),
    getCurrentAmount: () => currentBalance,
    getCurrentAmountNotifier: () => balanceNotifier,
    getAllegedBrand: () => brand,
    // eslint-disable-next-line no-use-before-define
    getDepositFacet: () => depositFacet,
  });

  const depositFacet = Far(`${allegedName} depositFacet`, {
    receive: purse.deposit,
  });

  return purse;
};
