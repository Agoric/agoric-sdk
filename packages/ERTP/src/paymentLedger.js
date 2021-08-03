// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isPromise } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
import { makeWeakStore } from '@agoric/store';

import { AmountMath } from './amountMath.js';
import { makePayment } from './payment.js';
import { makePurse } from './purse.js';

import '@agoric/store/exported';

/**
 * Make the paymentLedger, the source of truth for the balances of
 * payments. All minting and transfer authority originates here.
 *
 * @param {string} allegedName
 * @param {Brand} brand
 * @param {AssetKind} assetKind
 * @param {DisplayInfo} displayInfo
 * @param {ShutdownWithFailure=} optShutdownWithFailure
 * @returns {{ issuer: Issuer, mint: Mint }}
 */
export const makePaymentLedger = (
  allegedName,
  brand,
  assetKind,
  displayInfo,
  optShutdownWithFailure = undefined,
) => {
  /** @type {ShutdownWithFailure} */
  const shutdownLedgerWithFailure = reason => {
    // TODO This should also destroy ledger state.
    // See https://github.com/Agoric/agoric-sdk/issues/3434
    if (optShutdownWithFailure !== undefined) {
      optShutdownWithFailure(reason);
    }
    throw reason;
  };

  /** @type {WeakStore<Payment, Amount>} */
  const paymentLedger = makeWeakStore('payment');

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
   * Methods like deposit() have an optional second parameter `amount`
   * which, if present, is supposed to be equal to the balance of the
   * payment. This helper function does that check.
   *
   * @param {Amount} paymentBalance
   * @param {Amount | undefined} amount
   * @returns {void}
   */
  const assertAmountConsistent = (paymentBalance, amount) => {
    if (amount !== undefined) {
      assert(
        isEqual(amount, paymentBalance),
        X`payment balance ${paymentBalance} must equal amount ${amount}`,
      );
    }
  };

  /**
   * @param {Payment} payment
   * @returns {void}
   */
  const assertLivePayment = payment => {
    assert(paymentLedger.has(payment), X`payment not found for ${allegedName}`);
  };

  /**
   * Reallocate assets from the `payments` passed in to new payments
   * created and returned, with balances from `newPaymentBalances`.
   * Enforces that total assets are conserved.
   *
   * Note that this is not the only operation that reallocates assets.
   * `purse.deposit` and `purse.withdraw` move assets between a purse and
   * a payment, and so must also enforce conservation there.
   *
   * @param {Payment[]} payments
   * @param {Amount[]} newPaymentBalances
   * @returns {Payment[]}
   */
  const reallocate = (payments, newPaymentBalances) => {
    // There may be zero, one, or many payments as input to
    // reallocate. We want to protect against someone passing in
    // what appears to be multiple payments that turn out to actually
    // be the same payment (an aliasing issue). The `combine` method
    // legitimately needs to take in multiple payments, but we don't
    // need to pay the costs of protecting against aliasing for the
    // other uses.

    if (payments.length > 1) {
      const antiAliasingStore = new Set();
      payments.forEach(payment => {
        if (antiAliasingStore.has(payment)) {
          throw Error('same payment seen twice');
        }
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
      payments.forEach(payment => paymentLedger.delete(payment));

      newPayments = newPaymentBalances.map(balance => {
        const newPayment = makePayment(allegedName, brand);
        paymentLedger.init(newPayment, balance);
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
  const burn = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, payment => {
      assertLivePayment(payment);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountConsistent(paymentBalance, optAmount);
      try {
        // COMMIT POINT.
        paymentLedger.delete(payment);
      } catch (err) {
        shutdownLedgerWithFailure(err);
        throw err;
      }
      return paymentBalance;
    });
  };

  /** @type {IssuerClaim} */
  const claim = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, srcPayment => {
      assertLivePayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      assertAmountConsistent(srcPaymentBalance, optAmount);
      // Note COMMIT POINT within reallocate.
      const [payment] = reallocate([srcPayment], [srcPaymentBalance]);
      return payment;
    });
  };

  /** @type {IssuerCombine} */
  const combine = (fromPaymentsPArray, optTotalAmount = undefined) => {
    // Payments in `fromPaymentsPArray` must be distinct. Alias
    // checking is delegated to the `reallocate` function.
    return Promise.all(fromPaymentsPArray).then(fromPaymentsArray => {
      fromPaymentsArray.every(assertLivePayment);
      const totalPaymentsBalance = fromPaymentsArray
        .map(paymentLedger.get)
        .reduce(add, emptyAmount);
      assertAmountConsistent(totalPaymentsBalance, optTotalAmount);
      // Note COMMIT POINT within reallocate.
      const [payment] = reallocate(fromPaymentsArray, [totalPaymentsBalance]);
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
      // Note COMMIT POINT within reallocate.
      const newPayments = reallocate(
        [srcPayment],
        [paymentAmountA, paymentAmountB],
      );
      return newPayments;
    });
  };

  /** @type {IssuerSplitMany} */
  const splitMany = (paymentP, amounts) => {
    return E.when(paymentP, srcPayment => {
      assertLivePayment(srcPayment);
      amounts = amounts.map(coerce);
      // Note COMMIT POINT within reallocate.
      const newPayments = reallocate([srcPayment], amounts);
      return newPayments;
    });
  };

  /** @type {MintPayment} */
  const mintPayment = newAmount => {
    newAmount = coerce(newAmount);
    const payment = makePayment(allegedName, brand);
    paymentLedger.init(payment, newAmount);
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
   * @param {Amount=} optAmount
   * @returns {Amount}
   */
  const deposit = (
    currentBalance,
    updatePurseBalance,
    srcPayment,
    optAmount = undefined,
  ) => {
    if (isPromise(srcPayment)) {
      throw TypeError(
        `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: E.when(paymentPromise, (actualPayment => deposit(actualPayment))`,
      );
    }
    assertLivePayment(srcPayment);
    const srcPaymentBalance = paymentLedger.get(srcPayment);
    // Note: this does not guarantee that optAmount itself is a valid stable amount
    assertAmountConsistent(srcPaymentBalance, optAmount);
    const newPurseBalance = add(srcPaymentBalance, currentBalance);
    try {
      // COMMIT POINT
      // Move the assets in `srcPayment` into this purse, using up the
      // source payment, such that total assets are conserved.
      paymentLedger.delete(srcPayment);
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
   * @returns {Payment}
   */
  const withdraw = (currentBalance, updatePurseBalance, amount) => {
    amount = coerce(amount);
    const newPurseBalance = subtract(currentBalance, amount);
    const payment = makePayment(allegedName, brand);
    try {
      // COMMIT POINT
      // Move the withdrawn assets from this purse into a new payment
      // which is returned. Total assets must remain conserved.
      updatePurseBalance(newPurseBalance);
      paymentLedger.init(payment, amount);
    } catch (err) {
      shutdownLedgerWithFailure(err);
      throw err;
    }
    return payment;
  };

  const purseMethods = {
    deposit,
    withdraw,
  };

  /** @type {Issuer} */
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
    makeEmptyPurse: () =>
      makePurse(allegedName, assetKind, brand, purseMethods),
  });

  /** @type {Mint} */
  const mint = Far(`${allegedName} mint`, {
    getIssuer: () => issuer,
    mintPayment,
  });

  return harden({
    issuer,
    mint,
  });
};
