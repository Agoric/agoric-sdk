import {
  defineDurableKindMulti,
  makeScalarBigSetStore,
  makeKindHandle,
} from '@agoric/vat-data';
import { provide } from '@agoric/store';
import { AmountMath } from './amountMath.js';
import { provideFakeNotifierKit } from './fakeDurableNotifier.js';

const { details: X } = assert;

const updatePurseBalance = (state, newPurseBalance) => {
  state.currentBalance = newPurseBalance;
  state.balanceUpdater.updateState(state.currentBalance);
};

//  `getBrand` must not be called before the issuerKit is created
export const defineDurablePurse = (
  issuerBaggage,
  allegedName,
  assetKind,
  getBrand,
  purseMethods,
) => {
  const makeFakeNotifierKit = provideFakeNotifierKit(issuerBaggage);
  // - This kind is a pair of purse and depositFacet that have a 1:1
  //   correspondence.
  // - They are virtualized together to share a single state record.
  // - An alternative design considered was to have this return a Purse alone
  //   that created depositFacet as needed. But this approach ensures a constant
  //   identity for the facet and exercises the multi-faceted object style.
  const { depositInternal, withdrawInternal } = purseMethods;
  const purseKitKindHandle = provide(issuerBaggage, 'purseKitKindHandle', () =>
    makeKindHandle(`${allegedName} Purse`),
  );
  const makePurseKit = defineDurableKindMulti(
    purseKitKindHandle,
    () => {
      const currentBalance = AmountMath.makeEmpty(getBrand(), assetKind);

      /** @type {NotifierRecord<Amount>} */
      const { notifier: balanceNotifier, updater: balanceUpdater } =
        makeFakeNotifierKit(currentBalance);

      /** @type {SetStore<Payment>} */
      const recoverySet = makeScalarBigSetStore('recovery set', {
        durable: true,
      });

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
        getAllegedBrand: _context => getBrand(),
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: ({ facets }) => facets.depositFacet,

        getRecoverySet: ({ state }) => state.recoverySet.snapshot(),
        recoverAll: ({ state, facets }) => {
          const brand = getBrand();
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
harden(defineDurablePurse);
