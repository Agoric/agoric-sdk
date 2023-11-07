import { M, makeCopySet } from '@endo/patterns';
import { prepareExoClassKit, makeScalarBigSetStore } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { makeTransientNotifierKit } from './transientNotifier.js';

// TODO `InterfaceGuard` type parameter
/** @typedef {import('@endo/patterns').InterfaceGuard} InterfaceGuard */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail } = assert;

const EMPTY_COPY_SET = makeCopySet([]);

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
 * @param {WeakMapStore<Payment, SetStore<Payment>>} paymentRecoverySets
 */
export const preparePurseKind = (
  issuerBaggage,
  name,
  assetKind,
  brand,
  PurseIKit,
  purseMethods,
  recoverySetsState,
  paymentRecoverySets,
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
   * How many payments to clean out of the recoverySet on each call to
   * `cleanerRecoverySet`.
   */
  const CLEANING_BUDGET = 10;

  /**
   * If `recoverySetsState === 'hasRecoverySets'` (the normal state), then just
   * return `state.recoverySet`.
   *
   * If `recoverySetsState === 'noRecoverySets'`, then first delete up to
   * `CLEANING_BUDGET` payments from `state.recoverySet`, to eventually clean it
   * out. Then return `undefined`. Callers must be aware that the `undefined`
   * return happens iff `recoverySetsState === 'noRecoverySets'`, and to avoid
   * storing or retrieving anything from the actual recovery set.
   *
   * @param {{ recoverySet: SetStore<Payment> }} state
   * @returns {SetStore<Payment> | undefined}
   */
  const cleanerRecoverySet = state => {
    const { recoverySet } = state;
    if (recoverySetsState === 'hasRecoverySets') {
      return recoverySet;
    } else {
      assert(recoverySetsState === 'noRecoverySets');
      assert(paymentRecoverySets !== undefined);
      let i = 0;
      for (const payment of recoverySet.keys()) {
        if (i >= CLEANING_BUDGET) {
          break;
        }
        i += 1;
        // The stateShape constraint and the current lack of support for schema
        // upgrade means that we cannot upgrade `state.recoverySet` to
        // `undefined` or any non-remotable.
        //
        // At the time of this writing, SwingSet's liveSlots package does not
        // yet incrementalize the gc work of virtual and durable objects.
        // To avoid depending on that, this code does the incremental removal
        // of payments from recovery sets here. Doing so means that the cleanup
        // only happens when touched, which would be a potential problem if
        // an idle purse's recovery set held onto a lot of unneeded payments.
        // However, we currently only have this problem for quote issuers,
        // which we know store minted payments only in the mintRecoveryPurse's
        // recovery purse, which we also know to be perpetually active.
        assert(paymentRecoverySets.get(payment) === recoverySet);
        paymentRecoverySets.delete(payment);
        recoverySet.delete(payment);
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
          const optRecoverySet = cleanerRecoverySet(state);
          // Note COMMIT POINT within withdraw.
          return withdrawInternal(
            state.currentBalance,
            newPurseBalance =>
              updatePurseBalance(state, newPurseBalance, this.facets.purse),
            amount,
            optRecoverySet,
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
          const optRecoverySet = cleanerRecoverySet(state);
          if (optRecoverySet === undefined) {
            return EMPTY_COPY_SET;
          }
          return optRecoverySet.snapshot();
        },
        recoverAll() {
          const { state, facets } = this;
          let amount = AmountMath.makeEmpty(brand, assetKind);
          const optRecoverySet = cleanerRecoverySet(state);
          if (optRecoverySet === undefined) {
            // Note that even this case does only the gc work implied by the
            // call to `cleanerRecoverySet` above.
            return amount; // empty at this time
          }
          for (const payment of optRecoverySet.keys()) {
            // This does cause deletions from the set while iterating,
            // but this special case is allowed.
            const delta = facets.purse.deposit(payment);
            amount = AmountMath.add(amount, delta, brand);
          }
          optRecoverySet.getSize() === 0 ||
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
