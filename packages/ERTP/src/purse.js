import { makeNotifierKit } from '@agoric/notifier';
import { defineKind } from '@agoric/swingset-vat/src/storeModule.js';
import { AmountMath } from './amountMath.js';

export const makePurseMaker = (allegedName, assetKind, brand, purseMethods) => {
  const makeDepositFacet = defineKind(
    `${allegedName} depositFacet`,
    purse => ({ purse }),
    state => ({
      receive: (srcPayment, optAmountShape = undefined) =>
        state.purse.deposit(srcPayment, optAmountShape),
    }),
  );

  /** @type {() => Purse} */
  const makePurse = defineKind(
    `${allegedName} purse`,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

      /** @type {NotifierRecord<Amount>} */
      const { notifier: balanceNotifier, updater: balanceUpdater } =
        makeNotifierKit(currentBalance);

      return {
        currentBalance,
        balanceNotifier,
        balanceUpdater,
        depositFacet: undefined, // Will close the cycle
      };
    },
    state => {
      const updatePurseBalance = newPurseBalance => {
        state.currentBalance = newPurseBalance;
        state.balanceUpdater.updateState(newPurseBalance);
      };
      return {
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
        getCurrentAmountNotifier: () => state.balanceNotifier,
        getAllegedBrand: () => brand,
        getDepositFacet: () => state.depositFacet,
      };
    },
    // Close the cycle
    (state, purse) => {
      state.depositFacet = makeDepositFacet(purse);
    },
  );
  harden(makePurse);

  return makePurse;
};
harden(makePurseMaker);
