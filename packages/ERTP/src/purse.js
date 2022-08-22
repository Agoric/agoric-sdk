import {
  defineDurableKindMulti,
  makeScalarBigSetStore,
  provideKindHandle,
} from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { makeTransientNotifierKit } from './transientNotifier.js';

const { details: X } = assert;

//  `getBrand` must not be called before the issuerKit is created
export const vivifyPurseKind = (
  issuerBaggage,
  name,
  assetKind,
  getBrand,
  purseMethods,
) => {
  // Note: Virtual for high cardinality, but *not* durable, and so
  // broken across an upgrade.
  const { provideNotifier, update: updateBalance } = makeTransientNotifierKit();

  const updatePurseBalance = (state, newPurseBalance, purse) => {
    state.currentBalance = newPurseBalance;
    updateBalance(purse, purse.getCurrentAmount());
  };

  // - This kind is a pair of purse and depositFacet that have a 1:1
  //   correspondence.
  // - They are virtualized together to share a single state record.
  // - An alternative design considered was to have this return a Purse alone
  //   that created depositFacet as needed. But this approach ensures a constant
  //   identity for the facet and exercises the multi-faceted object style.
  const { depositInternal, withdrawInternal } = purseMethods;
  const purseKitKindHandle = provideKindHandle(issuerBaggage, `${name} Purse`);
  const makePurseKit = defineDurableKindMulti(
    purseKitKindHandle,
    () => {
      const currentBalance = AmountMath.makeEmpty(getBrand(), assetKind);

      /** @type {SetStore<Payment>} */
      const recoverySet = makeScalarBigSetStore('recovery set', {
        durable: true,
      });

      return {
        currentBalance,
        recoverySet,
      };
    },
    {
      purse: {
        deposit: (
          { state, facets: { purse } },
          srcPayment,
          optAmountShape = undefined,
        ) => {
          // Note COMMIT POINT within deposit.
          return depositInternal(
            state.currentBalance,
            newPurseBalance =>
              updatePurseBalance(state, newPurseBalance, purse),
            srcPayment,
            optAmountShape,
            state.recoverySet,
          );
        },
        withdraw: ({ state, facets: { purse } }, amount) =>
          // Note COMMIT POINT within withdraw.
          withdrawInternal(
            state.currentBalance,
            newPurseBalance =>
              updatePurseBalance(state, newPurseBalance, purse),
            amount,
            state.recoverySet,
          ),
        getCurrentAmount: ({ state }) => state.currentBalance,
        getCurrentAmountNotifier: ({ facets: { purse } }) =>
          provideNotifier(purse),
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
          if (!(state.recoverySet.getSize() === 0)) {
            assert.fail(
              X`internal: Remaining unrecovered payments: ${facets.purse.getRecoverySet()}`,
            );
          }
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
harden(vivifyPurseKind);
