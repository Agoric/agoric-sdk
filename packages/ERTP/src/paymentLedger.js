// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isPromise } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
import { makeWeakStore } from '@agoric/store';

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
 * @param {Atomic=} atomic
 * @returns {{ issuer: Issuer, mint: Mint }}
 */
export const makePaymentLedger = (
  allegedName,
  brand,
  assetKind,
  displayInfo,
  atomic = assert.atomic,
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
  const assertAmountConsistent = (paymentBalance, amount) => {
    if (amount !== undefined) {
      assert(
        isEqual(amount, paymentBalance),
        X`payment balance ${paymentBalance} must equal amount ${amount}`,
      );
    }
  };

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
   * @param {Commit} commit
   * @param {Payment[]} payments
   * @param {Amount[]} newPaymentBalances
   * @returns {Payment[]}
   */
  const reallocateAction = (commit, payments, newPaymentBalances) => {
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

    commit();
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
      assertLivePayment(payment);
      return paymentLedger.get(payment);
    });
  };

  const burn = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, payment =>
      atomic(commit => {
        assertLivePayment(payment);
        const paymentBalance = paymentLedger.get(payment);
        assertAmountConsistent(paymentBalance, optAmount);
        commit();
        paymentLedger.delete(payment);
        return paymentBalance;
      }),
    );
  };

  const claim = (paymentP, optAmount = undefined) => {
    return E.when(paymentP, srcPayment =>
      atomic(commit => {
        assertLivePayment(srcPayment);
        const srcPaymentBalance = paymentLedger.get(srcPayment);
        assertAmountConsistent(srcPaymentBalance, optAmount);

        const [payment] = reallocateAction(
          commit,
          [srcPayment],
          [srcPaymentBalance],
        );
        return payment;
      }),
    );
  };

  // Payments in `fromPaymentsPArray` must be distinct. Alias
  // checking is delegated to the `reallocate` function.
  const combine = (fromPaymentsPArray, optTotalAmount = undefined) => {
    return Promise.all(fromPaymentsPArray).then(fromPaymentsArray =>
      atomic(commit => {
        fromPaymentsArray.every(assertLivePayment);
        const totalPaymentsBalance = fromPaymentsArray
          .map(paymentLedger.get)
          .reduce(add, emptyAmount);
        assertAmountConsistent(totalPaymentsBalance, optTotalAmount);

        const [payment] = reallocateAction(commit, fromPaymentsArray, [
          totalPaymentsBalance,
        ]);
        return payment;
      }),
    );
  };

  // payment to two payments, A and B
  const split = (paymentP, paymentAmountA) => {
    return E.when(paymentP, srcPayment =>
      atomic(commit => {
        paymentAmountA = coerce(paymentAmountA);
        assertLivePayment(srcPayment);
        const srcPaymentBalance = paymentLedger.get(srcPayment);
        const paymentAmountB = subtract(srcPaymentBalance, paymentAmountA);

        const newPayments = reallocateAction(
          commit,
          [srcPayment],
          [paymentAmountA, paymentAmountB],
        );
        return newPayments;
      }),
    );
  };

  const splitMany = (paymentP, amounts) => {
    return E.when(paymentP, srcPayment =>
      atomic(commit => {
        assertLivePayment(srcPayment);
        amounts = amounts.map(coerce);

        const newPayments = reallocateAction(commit, [srcPayment], amounts);
        return newPayments;
      }),
    );
  };

  const mintPayment = newAmount => {
    newAmount = coerce(newAmount);
    const payment = makePayment();
    paymentLedger.init(payment, newAmount);
    return payment;
  };

  const depositAction = (
    commit,
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
    commit();
    // Move the assets in `srcPayment` into this purse, using up the
    // source payment, such that total assets are conserved.
    paymentLedger.delete(srcPayment);
    updatePurseBalance(newPurseBalance);
    return srcPaymentBalance;
  };

  const withdrawAction = (
    commit,
    currentBalance,
    updatePurseBalance,
    amount,
  ) => {
    amount = coerce(amount);
    const newPurseBalance = subtract(currentBalance, amount);
    const payment = makePayment();
    commit();
    // Move the withdrawn assets from this purse into a new payment
    // which is returned. Total assets must remain conserved.
    updatePurseBalance(newPurseBalance);
    paymentLedger.init(payment, amount);
    return payment;
  };

  const purseMethods = {
    depositAction,
    withdrawAction,
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
      makePurse(allegedName, assetKind, brand, purseMethods, atomic),
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
