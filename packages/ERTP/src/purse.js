import { Fail } from '@endo/errors';
import { M, makeCopySet } from '@agoric/store';
import { AmountMath } from './amountMath.js';
import { makeTransientNotifierKit } from './transientNotifier.js';
import { makeAmountStore } from './amountStore.js';

/** @import {Amount, AssetKind, AmountValue, AssetKindForValue, RecoverySetsOption, Brand, Payment} from './types.js' */

const EMPTY_COPY_SET = makeCopySet([]);

// TODO Type InterfaceGuard better than InterfaceGuard<any>
/**
 * @param {import('@agoric/zone').Zone} issuerZone
 * @param {string} name
 * @param {AssetKind} assetKind
 * @param {Brand} brand
 * @param {{
 *   purse: import('@endo/patterns').InterfaceGuard<any>;
 *   depositFacet: import('@endo/patterns').InterfaceGuard<any>;
 * }} PurseIKit
 * @param {{
 *   depositInternal: any;
 *   withdrawInternal: any;
 * }} purseMethods
 * @param {RecoverySetsOption} recoverySetsState
 * @param {WeakMapStore<Payment, SetStore<Payment>>} paymentRecoverySets
 */
export const preparePurseKind = (
  issuerZone,
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
  // TODO propagate zonifying to notifiers, maybe?
  const { provideNotifier, update: updateBalance } = makeTransientNotifierKit();

  /**
   * If `recoverySetsState === 'hasRecoverySets'` (the normal state), then just
   * return `state.recoverySet`.
   *
   * If `recoverySetsState === 'noRecoverySets'`, return `undefined`. Callers
   * must be aware that the `undefined` return happens iff `recoverySetsState
   * === 'noRecoverySets'`, and to avoid storing or retrieving anything from the
   * actual recovery set.
   *
   * @param {{ recoverySet: SetStore<Payment> }} state
   * @returns {SetStore<Payment> | undefined}
   */
  const maybeRecoverySet = state => {
    const { recoverySet } = state;
    if (recoverySetsState === 'hasRecoverySets') {
      return recoverySet;
    } else {
      recoverySetsState === 'noRecoverySets' ||
        Fail`recoverSetsState must be noRecoverySets if it isn't hasRecoverSets`;
      paymentRecoverySets !== undefined ||
        Fail`paymentRecoverySets must always be defined`;
      recoverySet.getSize() === 0 ||
        Fail`With noRecoverySets, recoverySet must be empty`;

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
  const makePurseKit = issuerZone.exoClassKit(
    `${name} Purse`,
    PurseIKit,
    () => {
      const currentBalance = AmountMath.makeEmpty(brand, assetKind);

      /** @type {SetStore<Payment>} */
      const recoverySet = issuerZone.detached().setStore('recovery set');

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
          const { purse } = this.facets;
          const balanceStore = makeAmountStore(state, 'currentBalance');
          // Note COMMIT POINT within deposit.
          const srcPaymentBalance = depositInternal(
            balanceStore,
            srcPayment,
            optAmountShape,
          );
          updateBalance(purse, balanceStore.getAmount());
          return srcPaymentBalance;
        },
        withdraw(amount) {
          const { state } = this;
          const { purse } = this.facets;

          const optRecoverySet = maybeRecoverySet(state);
          const balanceStore = makeAmountStore(state, 'currentBalance');
          // Note COMMIT POINT within withdraw.
          const payment = withdrawInternal(
            balanceStore,
            amount,
            optRecoverySet,
          );
          updateBalance(purse, balanceStore.getAmount());
          return payment;
        },
        getCurrentAmount() {
          const { state } = this;
          const balanceStore = makeAmountStore(state, 'currentBalance');
          return balanceStore.getAmount();
        },
        getCurrentAmountNotifier() {
          return provideNotifier(this.facets.purse);
        },
        getAllegedBrand() {
          return brand;
        },

        getDepositFacet() {
          return this.facets.depositFacet;
        },

        getRecoverySet() {
          const { state } = this;
          const optRecoverySet = maybeRecoverySet(state);
          if (optRecoverySet === undefined) {
            return EMPTY_COPY_SET;
          }
          return optRecoverySet.snapshot();
        },
        recoverAll() {
          const { state, facets } = this;
          let amount = AmountMath.makeEmpty(brand, assetKind);
          const optRecoverySet = maybeRecoverySet(state);
          if (optRecoverySet === undefined) {
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
