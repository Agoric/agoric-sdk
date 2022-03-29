import { makeNotifierKit } from '@agoric/notifier';
import { defineKind } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';

export const makePurseMaker = (allegedName, assetKind, brand, purseMethods) => {
  const updatePurseBalance = (state, newPurseBalance) => {
    state.currentBalance = newPurseBalance;
    state.balanceUpdater.updateState(state.currentBalance);
  };

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
    {
      purse: {
        deposit: ({ state }, srcPayment, optAmountShape = undefined) => {
          // Note COMMIT POINT within deposit.
          return purseMethods.deposit(
            state.currentBalance,
            newPurseBalance => updatePurseBalance(state, newPurseBalance),
            srcPayment,
            optAmountShape,
          );
        },
        withdraw: ({ state }, amount) =>
          // Note COMMIT POINT within withdraw.
          purseMethods.withdraw(
            state.currentBalance,
            newPurseBalance => updatePurseBalance(state, newPurseBalance),
            amount,
          ),
        getCurrentAmount: ({ state }) => state.currentBalance,
        getCurrentAmountNotifier: ({ state }) => state.balanceNotifier,
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: ({ facets }) => facets.depositFacet,
      },
      depositFacet: {
        receive: ({ facets }, ...args) => facets.purse.deposit(...args),
      },
    },
  );
  return () => makePurseKit().purse;
};
harden(makePurseMaker);
