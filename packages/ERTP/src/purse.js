import { makeNotifierKit } from '@agoric/notifier';
import { defineKind, makeScalarBigSetStore } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';

const { details: X } = assert;

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
  const { depositInternal, withdrawInternal, claimInternal } = purseMethods;
  const makePurseKit = defineKind(
    allegedName,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

      /** @type {NotifierRecord<Amount>} */
      const { notifier: balanceNotifier, updater: balanceUpdater } =
        makeNotifierKit(currentBalance);

      /** @type {SetStore<Payment>} */
      const recoverySet = makeScalarBigSetStore('recovery set');

      return {
        currentBalance,
        balanceNotifier,
        balanceUpdater,
        recoverySet,
      };
    },
    {
      purse: {
        deposit: ({ state }, srcPayment, optAmountShape = undefined) => {
          // Note COMMIT POINT within deposit.
          return depositInternal(
            state.currentBalance,
            newPurseBalance => updatePurseBalance(state, newPurseBalance),
            srcPayment,
            optAmountShape,
            state.recoverySet,
          );
        },
        withdraw: ({ state }, amount) =>
          // Note COMMIT POINT within withdraw.
          withdrawInternal(
            state.currentBalance,
            newPurseBalance => updatePurseBalance(state, newPurseBalance),
            amount,
            state.recoverySet,
          ),
        getCurrentAmount: ({ state }) => state.currentBalance,
        getCurrentAmountNotifier: ({ state }) => state.balanceNotifier,
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: ({ facets }) => facets.depositFacet,

        claim: ({ state }, paymentP, optAmountShape) =>
          claimInternal(paymentP, optAmountShape, state.recoverySet),
        getRecoverySet: ({ state }) => state.recoverySet.snapshot(),
        recoverAll: ({ state, facets }) => {
          let amount = AmountMath.makeEmpty(brand, assetKind);
          for (const payment of state.recoverySet.keys()) {
            // This does cause deletions from the set while iterating,
            // but this special case is allowed.
            const delta = facets.purse.deposit(payment);
            amount = AmountMath.add(amount, delta, brand);
          }
          assert(
            state.recoverySet.getSize() === 0,
            X`internal: Remaining unrecovered payments: ${facets.purse.getRecoverySet()}`,
          );
          return amount;
        },
      },
      depositFacet: {
        receive: ({ facets }, ...args) => facets.purse.deposit(...args),
      },
    },
  );
  return () => makePurseKit().purse;
};
harden(makePurseMaker);
