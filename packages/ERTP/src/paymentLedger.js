// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { isPromise } from '@endo/promise-kit';
import { Far, assertCopyArray } from '@endo/marshal';
import { fit } from '@agoric/store';
import { makeScalarBigWeakMapStore } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { definePaymentKind } from './payment.js';
import { makePurseMaker } from './purse.js';

import '@agoric/store/exported.js';

/**
 * Make the paymentLedger, the source of truth for the balances of
 * payments. All minting and transfer authority originates here.
 *
 * @template {AssetKind} [K=AssetKind]
 * @param {string} allegedName
 * @param {Brand} brand
 * @param {AssetKind} assetKind
 * @param {DisplayInfo} displayInfo
 * @param {Pattern} amountSchema
 * @param {ShutdownWithFailure=} optShutdownWithFailure
 * @returns {{ issuer: Issuer<K>, mint: Mint<K> }}
 */
export const makePaymentLedger = (
  allegedName,
  brand,
  assetKind,
  displayInfo,
  amountSchema,
  optShutdownWithFailure = undefined,
) => {
  const makePayment = definePaymentKind(allegedName, brand);

  /** @type {ShutdownWithFailure} */
  const shutdownLedgerWithFailure = reason => {
    // TODO This should also destroy ledger state.
    // See https://github.com/Agoric/agoric-sdk/issues/3434
    if (optShutdownWithFailure !== undefined) {
      try {
        optShutdownWithFailure(reason);
      } catch (errInShutdown) {
        assert.note(errInShutdown, X`Caused by: ${reason}`);
        throw errInShutdown;
      }
    }
    throw reason;
  };

  /** @type {WeakMapStore<Payment, Amount>} */
  const paymentLedger = makeScalarBigWeakMapStore('payment');

  /**
   * A withdrawn live payment is associated with the recovery set of
   * the purse it was withdrawn from. Let's call these "recoverable"
   * payments. All recoverable payments are live, but not all live
   * payments are recoverable. We do the bookkeeping for payment recovery
   * with this weakmap from recoverable payments to the recovery set they are
   * in.
   * A bunch of interesting invariants here:
   *    * Every payment that is a key in the outer `paymentRecoverySets`
   *      weakMap is also in the recovery set indexed by that payment.
   *    * Implied by the above but worth stating: the payment is only
   *      in at most one recovery set.
   *    * A recovery set only contains such payments.
   *    * Every purse is associated with exactly one recovery set unique to
   *      it.
   *    * A purse's recovery set only contains payments withdrawn from
   *      that purse and not yet consumed.
   *
   * @type {WeakMapStore<Payment, SetStore<Payment>>}
   */
  const paymentRecoverySets = makeScalarBigWeakMapStore('payment-recovery');

  /**
   * To maintain the invariants listed in the `paymentRecoverySets` comment,
   * `initPayment` should contain the only
   * call to `paymentLedger.init`.
   *
   * @param {Payment} payment
   * @param {Amount} amount
   * @param {SetStore<Payment>} [optRecoverySet]
   */
  const initPayment = (payment, amount, optRecoverySet = undefined) => {
    if (optRecoverySet !== undefined) {
      optRecoverySet.add(payment);
      paymentRecoverySets.init(payment, optRecoverySet);
    }
    paymentLedger.init(payment, amount);
  };

  /**
   * To maintain the invariants listed in the `paymentRecoverySets` comment,
   * `deletePayment` should contain the only
   * call to `paymentLedger.delete`.
   *
   * @param {Payment} payment
   */
  const deletePayment = payment => {
    paymentLedger.delete(payment);
    if (paymentRecoverySets.has(payment)) {
      const recoverySet = paymentRecoverySets.get(payment);
      paymentRecoverySets.delete(payment);
      recoverySet.delete(payment);
    }
  };

  /** @type {(left: Amount, right: Amount) => Amount } */
  const add = (left, right) => AmountMath.add(left, right, brand);
  /** @type {(left: Amount, right: Amount) => Amount } */
  const subtract = (left, right) => AmountMath.subtract(left, right, brand);
  /** @type {(allegedAmount: Amount) => Amount} */
  const coerce = allegedAmount => AmountMath.coerce(brand, allegedAmount);
  /** @type {(left: Amount, right: Amount) => boolean } */
  const isEqual = (left, right) => AmountMath.isEqual(left, right, brand);

  /** @type {Amount} */
  const emptyAmount = AmountMath.makeEmpty(brand, assetKind);

  /**
   * Methods like deposit() have an optional second parameter
   * `optAmountShape`
   * which, if present, is supposed to match the balance of the
   * payment. This helper function does that check.
   *
   * Note: `optAmountShape` is user-supplied with no previous validation.
   *
   * @param {Amount} paymentBalance
   * @param {Pattern=} optAmountShape
   * @returns {void}
   */
  const assertAmountConsistent = (paymentBalance, optAmountShape) => {
    if (optAmountShape !== undefined) {
      fit(paymentBalance, optAmountShape);
    }
  };

  /**
   * @param {Payment} payment
   * @returns {void}
   */
  const assertLivePayment = payment => {
    assert(
      paymentLedger.has(payment),
      X`${payment} was not a live payment for brand ${brand}. It could be a used-up payment, a payment for another brand, or it might not be a payment at all.`,
    );
  };

  /**
   * Reallocate assets from the `payments` passed in to new payments
   * created and returned, with balances from `newPaymentBalances`.
   * Enforces that total assets are conserved.
   *
   * Note that this is not the only operation that moves assets.
   * `purse.deposit` and `purse.withdraw` move assets between a purse and
   * a payment, and so must also enforce conservation there.
   *
   * @param {Payment[]} payments
   * @param {Amount[]} newPaymentBalances
   * @returns {Payment[]}
   */
  const moveAssets = (payments, newPaymentBalances) => {
    assertCopyArray(payments, 'payments');
    assertCopyArray(newPaymentBalances, 'newPaymentBalances');

    // There may be zero, one, or many payments as input to
    // moveAssets. We want to protect against someone passing in
    // what appears to be multiple payments that turn out to actually
    // be the same payment (an aliasing issue). The `combine` method
    // legitimately needs to take in multiple payments, but we don't
    // need to pay the costs of protecting against aliasing for the
    // other uses.

    if (payments.length > 1) {
      const antiAliasingStore = new Set();
      payments.forEach(payment => {
        assert(
          !antiAliasingStore.has(payment),
          `same payment ${payment} seen twice`,
        );
        antiAliasingStore.add(payment);
      });
    }

    const total = payments.map(paymentLedger.get).reduce(add, emptyAmount);

    const newTotal = newPaymentBalances.reduce(add, emptyAmount);

    // Invariant check
    assert(
      isEqual(total, newTotal),
      X`rights were not conserved: ${total} vs ${newTotal}`,
    );

    let newPayments;
    try {
      // COMMIT POINT
      payments.forEach(payment => deletePayment(payment));

      newPayments = newPaymentBalances.map(balance => {
        const newPayment = makePayment();
        initPayment(newPayment, balance, undefined);
        return newPayment;
      });
    } catch (err) {
      shutdownLedgerWithFailure(err);
      throw err;
    }
    return harden(newPayments);
  };

  /** @type {IssuerIsLive} */
  const isLive = paymentP => {
    return E.when(paymentP, payment => {
      return paymentLedger.has(payment);
    });
  };

  /** @type {IssuerGetAmountOf} */
  const getAmountOf = paymentP => {
    return E.when(paymentP, payment => {
      assertLivePayment(payment);
      return paymentLedger.get(payment);
    });
  };

  /** @type {IssuerBurn} */
  const burn = (paymentP, optAmountShape = undefined) => {
    return E.when(paymentP, payment => {
      assertLivePayment(payment);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountConsistent(paymentBalance, optAmountShape);
      try {
        // COMMIT POINT.
        deletePayment(payment);
      } catch (err) {
        shutdownLedgerWithFailure(err);
        throw err;
      }
      return paymentBalance;
    });
  };

  /** @type {IssuerClaim} */
  const claim = (paymentP, optAmountShape = undefined) => {
    return E.when(paymentP, srcPayment => {
      assertLivePayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      assertAmountConsistent(srcPaymentBalance, optAmountShape);
      // Note COMMIT POINT within moveAssets.
      const [payment] = moveAssets(
        harden([srcPayment]),
        harden([srcPaymentBalance]),
      );
      return payment;
    });
  };

  /** @type {IssuerCombine} */
  const combine = (fromPaymentsPArray, optTotalAmount = undefined) => {
    assertCopyArray(fromPaymentsPArray, 'fromPaymentsArray');
    // Payments in `fromPaymentsPArray` must be distinct. Alias
    // checking is delegated to the `moveAssets` function.
    return Promise.all(fromPaymentsPArray).then(fromPaymentsArray => {
      fromPaymentsArray.every(assertLivePayment);
      const totalPaymentsBalance = fromPaymentsArray
        .map(paymentLedger.get)
        .reduce(add, emptyAmount);
      assertAmountConsistent(totalPaymentsBalance, optTotalAmount);
      // Note COMMIT POINT within moveAssets.
      const [payment] = moveAssets(
        harden(fromPaymentsArray),
        harden([totalPaymentsBalance]),
      );
      return payment;
    });
  };

  /** @type {IssuerSplit} */
  // payment to two payments, A and B
  const split = (paymentP, paymentAmountA) => {
    return E.when(paymentP, srcPayment => {
      paymentAmountA = coerce(paymentAmountA);
      assertLivePayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      const paymentAmountB = subtract(srcPaymentBalance, paymentAmountA);
      // Note COMMIT POINT within moveAssets.
      const newPayments = moveAssets(
        harden([srcPayment]),
        harden([paymentAmountA, paymentAmountB]),
      );
      return newPayments;
    });
  };

  /** @type {IssuerSplitMany} */
  const splitMany = (paymentP, amounts) => {
    return E.when(paymentP, srcPayment => {
      assertLivePayment(srcPayment);
      assertCopyArray(amounts, 'amounts');
      amounts = amounts.map(coerce);
      // Note COMMIT POINT within moveAssets.
      const newPayments = moveAssets(harden([srcPayment]), harden(amounts));
      return newPayments;
    });
  };

  /**
   * Creates a new Payment containing newly minted amount.
   *
   * @param {Amount<K>} newAmount
   * @returns {Payment<K>}
   */
  const mintPayment = newAmount => {
    newAmount = coerce(newAmount);
    fit(newAmount, amountSchema);
    const payment = makePayment();
    initPayment(payment, newAmount, undefined);
    return payment;
  };

  /**
   * Used by the purse code to implement purse.deposit
   *
   * @param {Amount} currentBalance - the current balance of the purse
   * before a deposit
   * @param {(newPurseBalance: Amount) => void} updatePurseBalance -
   * commit the purse balance
   * @param {Payment} srcPayment
   * @param {Pattern=} optAmountShape
   * @returns {Amount}
   */
  const depositInternal = (
    currentBalance,
    updatePurseBalance,
    srcPayment,
    optAmountShape = undefined,
  ) => {
    assert(
      !isPromise(srcPayment),
      `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: E.when(paymentPromise, (actualPayment => deposit(actualPayment))`,
      TypeError,
    );
    assertLivePayment(srcPayment);
    const srcPaymentBalance = paymentLedger.get(srcPayment);
    assertAmountConsistent(srcPaymentBalance, optAmountShape);
    const newPurseBalance = add(srcPaymentBalance, currentBalance);
    try {
      // COMMIT POINT
      // Move the assets in `srcPayment` into this purse, using up the
      // source payment, such that total assets are conserved.
      deletePayment(srcPayment);
      updatePurseBalance(newPurseBalance);
    } catch (err) {
      shutdownLedgerWithFailure(err);
      throw err;
    }
    return srcPaymentBalance;
  };

  /**
   * Used by the purse code to implement purse.withdraw
   *
   * @param {Amount} currentBalance - the current balance of the purse
   * before a withdrawal
   * @param {(newPurseBalance: Amount) => void} updatePurseBalance -
   * commit the purse balance
   * @param {Amount} amount - the amount to be withdrawn
   * @param {SetStore<Payment>} recoverySet
   * @returns {Payment}
   */
  const withdrawInternal = (
    currentBalance,
    updatePurseBalance,
    amount,
    recoverySet,
  ) => {
    amount = coerce(amount);
    assert(
      AmountMath.isGTE(currentBalance, amount),
      X`Withdrawal of ${amount} failed because the purse only contained ${currentBalance}`,
    );
    const newPurseBalance = subtract(currentBalance, amount);

    const payment = makePayment();
    try {
      // COMMIT POINT Move the withdrawn assets from this purse into
      // payment. Total assets must remain conserved.
      updatePurseBalance(newPurseBalance);
      initPayment(payment, amount, recoverySet);
    } catch (err) {
      shutdownLedgerWithFailure(err);
      throw err;
    }
    return payment;
  };

  const purseMethods = {
    depositInternal,
    withdrawInternal,
  };

  const makeEmptyPurse = makePurseMaker(
    allegedName,
    assetKind,
    brand,
    purseMethods,
  );

  /** @type {Issuer<K>} */
  const issuer = Far(`${allegedName} issuer`, {
    isLive,
    getAmountOf,
    burn,
    claim,
    combine,
    split,
    splitMany,
    getBrand: () => brand,
    getAllegedName: () => allegedName,
    getAssetKind: () => assetKind,
    getDisplayInfo: () => displayInfo,
    makeEmptyPurse,
  });

  /** @type {Mint<K>} */
  const mint = Far(`${allegedName} mint`, {
    getIssuer: () => issuer,
    mintPayment,
  });

  return harden({
    issuer,
    mint,
  });
};

/** @typedef {ReturnType<makePaymentLedger>} PaymentLedger */
