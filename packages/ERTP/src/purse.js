import { makeNotifierKit } from '@agoric/notifier';
import { defineKind } from '@agoric/swingset-vat/src/storeModule.js';
import { AmountMath } from './amountMath.js';

export const makePurseMaker = (allegedName, assetKind, brand, purseMethods) => {
  // - This kind is a pair of purse and depositFacet that have a 1:1
  //   correspondence.
  // - They are virtualized together to share a single state record.
  // - An alternative design considered was to have this return a Purse alone
  //   that created depositFacet as needed. But this approach ensures a constant
  //   identity for the facet and exercises the multi-faceted object style.
  const makePurseKit = defineKind(
    allegedName,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

      /** @type {NotifierRecord<Amount>} */
      const { notifier: balanceNotifier, updater: balanceUpdater } =
        makeNotifierKit(currentBalance);

      return {
        currentBalance,
        balanceNotifier,
        balanceUpdater,
      };
    },
    state => {
      const { balanceNotifier, balanceUpdater } = state;
      const updatePurseBalance = newPurseBalance => {
        state.currentBalance = newPurseBalance;
        balanceUpdater.updateState(state.currentBalance);
      };

      /** @type {Purse} */
      const purse = {
        deposit: (srcPayment, optAmountShape = undefined) => {
          // Note COMMIT POINT within deposit.
          return purseMethods.deposit(
            state.currentBalance,
            updatePurseBalance,
            srcPayment,
            optAmountShape,
          );
        },
        withdraw: amount =>
          // Note COMMIT POINT within withdraw.
          purseMethods.withdraw(
            state.currentBalance,
            updatePurseBalance,
            amount,
          ),
        getCurrentAmount: () => state.currentBalance,
        getCurrentAmountNotifier: () => balanceNotifier,
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: () => depositFacet,
      };
      const depositFacet = {
        receive: purse.deposit,
      };
      return { purse, depositFacet };
    },
  );
  return () => makePurseKit().purse;
};
harden(makePurseMaker);
