// @ts-check
/* global makeWeakStore */

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isPromise } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

import { AmountMath } from './amountMath';
import { makePaymentMaker } from './payment';
import { makePurse } from './purse';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/store/exported';

/**
 * Make the paymentLedger, the source of truth for the balances of
 * payments. All minting and transfer authority originates here.
 *
 * @param {string} allegedName
 * @param {Brand} brand
 * @param {AssetKind} assetKind
 * @param {DisplayInfo} displayInfo
 * @returns {{ issuer: Issuer, mint: Mint }}
 */
export const makePaymentLedger = (
  allegedName,
  brand,
  assetKind,
  displayInfo,
) => {
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

  const makePayment = makePaymentMaker(allegedName, brand);

  // Methods like deposit() have an optional second parameter `amount`
  // which, if present, is supposed to be equal to the balance of the
  // payment. This helper function does that check.
  const assertAmountEqual = (paymentBalance, amount) => {
    if (amount !== undefined) {
      assert(
        isEqual(amount, paymentBalance),
        X`payment balance ${paymentBalance} must equal amount ${amount}`,
      );
    }
  };

  const assertKnownPayment = payment => {
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
      const antiAliasingStore = makeWeakStore('payment');
      payments.forEach(payment => {
        if (antiAliasingStore.has(payment)) {
          throw Error('same payment seen twice');
        }
        antiAliasingStore.init(payment, undefined);
      });
    }

    const total = payments.map(paymentLedger.get).reduce(add, emptyAmount);

    const newTotal = newPaymentBalances.reduce(add, emptyAmount);

    // Invariant check
    assert(isEqual(total, newTotal), 'rights were not conserved');

    // commit point
    payments.forEach(payment => paymentLedger.delete(payment));

    const newPayments = newPaymentBalances.map(balance => {
      const newPayment = makePayment();
      paymentLedger.init(newPayment, balance);
      return newPayment;
    });

    return harden(newPayments);
  };

  const isLive = paymentP => {
    return E.when(paymentP, payment => {
      return paymentLedger.has(payment);
    });
  };

  const getAmountOf = paymentP => {
    return E.when(paymentP, payment => {
      assertKnownPayment(payment);
      return paymentLedger.get(payment);
    });
  };

  const burn = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, payment => {
      assertKnownPayment(payment);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountEqual(paymentBalance, optAmount);
      // Commit point.
      paymentLedger.delete(payment);
      return paymentBalance;
    });
  };

  const claim = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, srcPayment => {
      assertKnownPayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      assertAmountEqual(srcPaymentBalance, optAmount);
      // Commit point.
      const [payment] = reallocate([srcPayment], [srcPaymentBalance]);
      return payment;
    });
  };

  // Payments in `fromPaymentsPArray` must be distinct. Alias
  // checking is delegated to the `reallocate` function.
  const combine = (fromPaymentsPArray, optTotalAmount = undefined) => {
    return Promise.all(fromPaymentsPArray).then(fromPaymentsArray => {
      fromPaymentsArray.every(assertKnownPayment);
      const totalPaymentsBalance = fromPaymentsArray
        .map(paymentLedger.get)
        .reduce(add, emptyAmount);
      assertAmountEqual(totalPaymentsBalance, optTotalAmount);
      // Commit point.
      const [payment] = reallocate(fromPaymentsArray, [totalPaymentsBalance]);
      return payment;
    });
  };

  // payment to two payments, A and B
  const split = (paymentP, paymentAmountA) => {
    return E.when(paymentP, srcPayment => {
      paymentAmountA = coerce(paymentAmountA);
      assertKnownPayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      const paymentAmountB = subtract(srcPaymentBalance, paymentAmountA);
      // Commit point
      const newPayments = reallocate(
        [srcPayment],
        [paymentAmountA, paymentAmountB],
      );
      return newPayments;
    });
  };

  const splitMany = (paymentP, amounts) => {
    return E.when(paymentP, srcPayment => {
      assertKnownPayment(srcPayment);
      amounts = amounts.map(coerce);
      // Commit point
      const newPayments = reallocate([srcPayment], amounts);
      return newPayments;
    });
  };

  const mintPayment = newAmount => {
    newAmount = coerce(newAmount);
    const payment = makePayment();
    paymentLedger.init(payment, newAmount);
    return payment;
  };

  const deposit = (
    currentBalance,
    commit,
    srcPayment,
    optAmount = undefined,
  ) => {
    if (isPromise(srcPayment)) {
      throw TypeError(
        `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: paymentPromise.then(actualPayment => deposit(actualPayment))`,
      );
    }
    assertKnownPayment(srcPayment);
    const srcPaymentBalance = paymentLedger.get(srcPayment);
    // Note: this does not guarantee that optAmount itself is a valid stable amount
    assertAmountEqual(srcPaymentBalance, optAmount);
    const newPurseBalance = add(srcPaymentBalance, currentBalance);
    // Commit point
    // Move the assets in `srcPayment` into this purse, using up the
    // source payment, such that total assets are conserved.
    paymentLedger.delete(srcPayment);
    commit(newPurseBalance);
    return srcPaymentBalance;
  };

  const withdraw = (currentBalance, commit, amount) => {
    amount = coerce(amount);
    const newPurseBalance = subtract(currentBalance, amount);
    const payment = makePayment();
    // Commit point
    // Move the withdrawn assets from this purse into a new payment
    // which is returned. Total assets must remain conserved.
    commit(newPurseBalance);
    paymentLedger.init(payment, amount);
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
