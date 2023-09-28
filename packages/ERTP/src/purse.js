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
 * @param {RecoverySetOption} [recoverySetOption] Added in upgrade, so last and
 *   optional.
 */
export const preparePurseKind = (
  issuerBaggage,
  name,
  assetKind,
  brand,
  PurseIKit,
  purseMethods,
  recoverySetOption = undefined,
) => {
  const amountShape = brand.getAmountShape();

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
  const makePurseKit = prepareExoClassKit(
    issuerBaggage,
    `${name} Purse`,
    PurseIKit,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

      /** @type {SetStore<Payment> | undefined} */
      const recoverySet =
        recoverySetOption === 'noRecoverySets'
          ? undefined
          : makeScalarBigSetStore('recovery set', {
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
            state.recoverySet,
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
          if (recoverySetOption === 'noRecoverySets') {
            return undefined;
          }
          assert(this.state.recoverySet !== undefined);
          return this.state.recoverySet.snapshot();
        },
        recoverAll() {
          if (recoverySetOption === 'noRecoverySets') {
            return undefined;
          }
          const { state, facets } = this;
          assert(state.recoverySet !== undefined);
          let amount = AmountMath.makeEmpty(brand, assetKind);
          for (const payment of state.recoverySet.keys()) {
            // This does cause deletions from the set while iterating,
            // but this special case is allowed.
            const delta = facets.purse.deposit(payment);
            amount = AmountMath.add(amount, delta, brand);
          }
          state.recoverySet.getSize() === 0 ||
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
        // NOTE: Schema change!
        recoverySet: M.opt(M.remotable('recoverySet')),
      },
    },
  );
  return () => makePurseKit().purse;
};
harden(preparePurseKind);
