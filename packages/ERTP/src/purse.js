import { M } from '@agoric/store';
import { prepareExoClassKit, makeScalarBigSetStore } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { makeTransientNotifierKit } from './transientNotifier.js';

// TODO `InterfaceGuard` type parameter
/** @typedef {import('@endo/patterns').InterfaceGuard} InterfaceGuard */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail } = assert;

/**
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {AssetKind} assetKind
 * @param {Brand} brand
 * @param {{
 *   purse: InterfaceGuard;
 *   depositFacet: InterfaceGuard;
 * }} PurseIKit
 * @param {{
 *   depositInternal: any;
 *   withdrawInternal: any;
 * }} purseMethods
 * @param {RecoverySetsOption} recoverySetsState
 */
export const preparePurseKind = (
  issuerBaggage,
  name,
  assetKind,
  brand,
  PurseIKit,
  purseMethods,
  recoverySetsState,
) => {
  const amountShape = brand.getAmountShape();

  // Note: Virtual for high cardinality, but *not* durable, and so
  // broken across an upgrade.
  const { provideNotifier, update: updateBalance } = makeTransientNotifierKit();

  const updatePurseBalance = (state, newPurseBalance, purse) => {
    state.currentBalance = newPurseBalance;
    updateBalance(purse, purse.getCurrentAmount());
  };

  /**
   * @param {any} state
   * @returns {SetStore<Payment> | undefined}
   */
  const getRecoverySet = state => {
    const { recoverySet } = state;
    if (recoverySetsState === 'hasRecoverySets') {
      return recoverySet;
    } else {
      assert(recoverySetsState === 'noRecoverySets');
      if (recoverySet.getSize() >= 1) {
        // The stateShape constraint and the current lack of support for schema
        // upgrade means that we cannot upgrade `state.recoverySet` to
        // `undefined` or any non-remotable.
        //
        // Upgrade by dropping the old recoverySet and replacing it with a
        // new empty one, which we hopefully never add to.
        // Depending on conditions elsewhere, this may cause lots of payments
        // to become unreachable simultaneously. This code depends on SwingSet to
        // incrementalize the resulting gc work. (TODO this SwingSet feature is
        // not yet implemented.)

        state.recoverySet = makeScalarBigSetStore('recovery set');
      }
      return undefined;
    }
  };

  // - This kind is a pair of purse and depositFacet that have a 1:1
  //   correspondence.
  // - They are virtualized together to share a single state record.
  // - An alternative design considered was to have this return a Purse alone
  //   that created depositFacet as needed. But this approach ensures a constant
  //   identity for the facet and exercises the multi-faceted object style.
  const { depositInternal, withdrawInternal } = purseMethods;
  const makePurseKit = prepareExoClassKit(
    issuerBaggage,
    `${name} Purse`,
    PurseIKit,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

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
        deposit(srcPayment, optAmountShape = undefined) {
          // PurseI does *not* delay `deposit` until `srcPayment` is fulfulled.
          // See the comments on PurseI.deposit in typeGuards.js
          const { state } = this;
          // Note COMMIT POINT within deposit.
          return depositInternal(
            state.currentBalance,
            newPurseBalance =>
              updatePurseBalance(state, newPurseBalance, this.facets.purse),
            srcPayment,
            optAmountShape,
          );
        },
        withdraw(amount) {
          const { state } = this;
          // Note COMMIT POINT within withdraw.
          return withdrawInternal(
            state.currentBalance,
            newPurseBalance =>
              updatePurseBalance(state, newPurseBalance, this.facets.purse),
            amount,
            getRecoverySet(state),
          );
        },
        getCurrentAmount() {
          return this.state.currentBalance;
        },
        getCurrentAmountNotifier() {
          return provideNotifier(this.facets.purse);
        },
        getAllegedBrand() {
          return brand;
        },
        // eslint-disable-next-line no-use-before-define
        getDepositFacet() {
          return this.facets.depositFacet;
        },

        getRecoverySet() {
          const { state } = this;
          void getRecoverySet(state); // just for the possible side effect
          return state.recoverySet.snapshot();
        },
        recoverAll() {
          const { state, facets } = this;
          let amount = AmountMath.makeEmpty(brand, assetKind);
          const recoverySet = getRecoverySet(state);
          if (recoverySet === undefined) {
            return amount; // empty at this time
          }
          for (const payment of recoverySet.keys()) {
            // This does cause deletions from the set while iterating,
            // but this special case is allowed.
            const delta = facets.purse.deposit(payment);
            amount = AmountMath.add(amount, delta, brand);
          }
          recoverySet.getSize() === 0 ||
            Fail`internal: Remaining unrecovered payments: ${facets.purse.getRecoverySet()}`;
          return amount;
        },
      },
      depositFacet: {
        receive(...args) {
          return this.facets.purse.deposit(...args);
        },
      },
    },
    {
      stateShape: {
        currentBalance: amountShape,
        recoverySet: M.remotable('recoverySet'),
      },
    },
  );
  return () => makePurseKit().purse;
};
harden(preparePurseKind);
