import { makeNotifierKit } from '@agoric/notifier';
import { AmountMath } from './amountMath';

import { markDepositFacet, markPurse } from './markObjects';

export const makePurse = (allegedName, assetKind, brand, purseMethods) => {
  let currentBalance = AmountMath.makeEmpty(brand, assetKind);

  /** @type {NotifierRecord<Amount>} */
  const {
    notifier: balanceNotifier,
    updater: balanceUpdater,
  } = makeNotifierKit(currentBalance);

  const commit = newPurseBalance => {
    currentBalance = newPurseBalance;
    balanceUpdater.updateState(currentBalance);
  };

  /** @type {Purse} */
  const purse = markPurse(allegedName, {
    deposit: (srcPayment, optAmount = undefined) => {
      return purseMethods.deposit(
        currentBalance,
        commit,
        srcPayment,
        optAmount,
      );
    },
    withdraw: amount => {
      return purseMethods.withdraw(currentBalance, commit, amount);
    },
    getCurrentAmount: () => currentBalance,
    getCurrentAmountNotifier: () => balanceNotifier,
    getAllegedBrand: () => brand,
    // eslint-disable-next-line no-use-before-define
    getDepositFacet: () => depositFacet,
  });

  const depositFacet = markDepositFacet(allegedName, {
    receive: purse.deposit,
  });

  return purse;
};
