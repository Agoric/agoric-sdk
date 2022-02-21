import { makeNotifierKit } from '@agoric/notifier';
import {
  defineKind,
  makeScalarBigWeakMapStore,
} from '@agoric/swingset-vat/src/storeModule.js';
import { AmountMath } from './amountMath.js';

export const makePurseMaker = (allegedName, assetKind, brand, purseMethods) => {
  /** @type {WeakMap<Purse, PurseDeposit>} */
  const depositFacets = makeScalarBigWeakMapStore('deposit facets');

  /** @type {() => Purse} */
  const makePurseInternal = defineKind(
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
      };
    },
    state => {
      const updatePurseBalance = newPurseBalance => {
        state.currentBalance = newPurseBalance;
        state.balanceUpdater.updateState(newPurseBalance);
      };
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
        getCurrentAmountNotifier: () => state.balanceNotifier,
        getAllegedBrand: () => brand,
        getDepositFacet: () => depositFacets.get(purse),
      };
      return purse;
    },
  );

  const makeDepositFacet = defineKind(
    `${allegedName} depositFacet`,
    purse => ({ purse }),
    state => ({
      receive: (srcPayment, optAmountShape = undefined) =>
        state.purse.deposit(srcPayment, optAmountShape),
    }),
  );

  const makePurse = () => {
    const purse = makePurseInternal();
    const depositFacet = makeDepositFacet(purse);
    depositFacets.init(purse, depositFacet);
    return purse;
  };
  harden(makePurse);

  return makePurse;
};
harden(makePurseMaker);
