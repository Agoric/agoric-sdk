// @ts-check
/* global makeWeakStore */

'use jessie';

import { assert, details as X } from '@agoric/assert';
import { makeExternalStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { isPromise } from '@agoric/promise-kit';

import { amountMath, MathKind } from './amountMath';
import { makeAmountMath } from './deprecatedAmountMath';
import { makeFarName, ERTPKind } from './interfaces';
import { coerceDisplayInfo } from './displayInfo';
import { makePaymentMaker } from './payment';

import './types';

/**
 * @type {MakeIssuerKit}
 */
function makeIssuerKit(
  allegedName,
  amountMathKind = MathKind.NAT,
  displayInfo = undefined,
) {
  assert.typeof(allegedName, 'string');
  displayInfo = coerceDisplayInfo(displayInfo);

  const brand = Far(makeFarName(allegedName, ERTPKind.BRAND), {
    isMyIssuer: allegedIssuerP => {
      return E.when(allegedIssuerP, allegedIssuer => {
        // eslint-disable-next-line no-use-before-define
        return allegedIssuer === issuer;
      });
    },
    getAllegedName: () => allegedName,

    // Give information to UI on how to display the amount.
    getDisplayInfo: () => displayInfo,
  });

  /** @type {(left: Amount, right: Amount) => Amount } */
  const add = (left, right) => amountMath.add(left, right, brand);
  /** @type {(left: Amount, right: Amount) => Amount } */
  const subtract = (left, right) => amountMath.subtract(left, right, brand);
  /** @type {(allegedAmount: Amount) => Amount} */
  const coerce = allegedAmount => amountMath.coerce(allegedAmount, brand);
  /** @type {(left: Amount, right: Amount) => boolean } */
  const isEqual = (left, right) => amountMath.isEqual(left, right, brand);

  /** @type {Amount} */
  const emptyAmount = amountMath.makeEmpty(brand, amountMathKind);

  const makePayment = makePaymentMaker(allegedName, brand);

  /** @type {WeakStore<Payment, Amount>} */
  const paymentLedger = makeWeakStore('payment');

  function assertKnownPayment(payment) {
    assert(paymentLedger.has(payment), X`payment not found for ${allegedName}`);
  }

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

  const { makeInstance: makeDepositFacet } = makeExternalStore(
    'depositFacet',
    /**
     * @param {Purse} purse
     * @returns {DepositFacet}
     */
    purse =>
      Far(makeFarName(allegedName, ERTPKind.DEPOSIT_FACET), {
        receive: purse.deposit,
      }),
  );

  const { makeInstance: makePurse } = makeExternalStore('purse', () => {
    let currentBalance = emptyAmount;
    /** @type {NotifierRecord<Amount>} */
    const {
      notifier: balanceNotifier,
      updater: balanceUpdater,
    } = makeNotifierKit(currentBalance);

    /** @type {Purse} */
    const purse = Far(makeFarName(allegedName, ERTPKind.PURSE), {
      deposit: (srcPayment, optAmount = undefined) => {
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
        currentBalance = newPurseBalance;
        balanceUpdater.updateState(currentBalance);
        return srcPaymentBalance;
      },
      withdraw: amount => {
        amount = coerce(amount);
        const newPurseBalance = subtract(currentBalance, amount);
        const payment = makePayment();
        // Commit point
        // Move the withdrawn assets from this purse into a new payment
        // which is returned. Total assets must remain conserved.
        currentBalance = newPurseBalance;
        balanceUpdater.updateState(currentBalance);
        paymentLedger.init(payment, amount);
        return payment;
      },
      getCurrentAmount: () => currentBalance,
      getCurrentAmountNotifier: () => balanceNotifier,
      getAllegedBrand: () => brand,
      // eslint-disable-next-line no-use-before-define
      getDepositFacet: () => depositFacet,
    });

    const depositFacet = makeDepositFacet(purse);
    return purse;
  });

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

  /** @type {Issuer} */
  const issuer = Far(makeFarName(allegedName, ERTPKind.ISSUER), {
    getBrand: () => brand,
    getAllegedName: () => allegedName,
    getAmountMathKind: () => amountMathKind,
    makeEmptyPurse: makePurse,

    isLive: paymentP => {
      return E.when(paymentP, payment => {
        return paymentLedger.has(payment);
      });
    },
    getAmountOf: paymentP => {
      return E.when(paymentP, payment => {
        assertKnownPayment(payment);
        return paymentLedger.get(payment);
      });
    },

    burn: (paymentP, optAmount = undefined) => {
      return E.when(paymentP, payment => {
        assertKnownPayment(payment);
        const paymentBalance = paymentLedger.get(payment);
        assertAmountEqual(paymentBalance, optAmount);
        // Commit point.
        paymentLedger.delete(payment);
        return paymentBalance;
      });
    },
    claim: (paymentP, optAmount = undefined) => {
      return E.when(paymentP, srcPayment => {
        assertKnownPayment(srcPayment);
        const srcPaymentBalance = paymentLedger.get(srcPayment);
        assertAmountEqual(srcPaymentBalance, optAmount);
        // Commit point.
        const [payment] = reallocate([srcPayment], [srcPaymentBalance]);
        return payment;
      });
    },
    // Payments in `fromPaymentsPArray` must be distinct. Alias
    // checking is delegated to the `reallocate` function.
    combine: (fromPaymentsPArray, optTotalAmount = undefined) => {
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
    },
    // payment to two payments, A and B
    split: (paymentP, paymentAmountA) => {
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
    },
    splitMany: (paymentP, amounts) => {
      return E.when(paymentP, srcPayment => {
        assertKnownPayment(srcPayment);
        amounts = amounts.map(coerce);
        // Commit point
        const newPayments = reallocate([srcPayment], amounts);
        return newPayments;
      });
    },
  });

  /** @type {Mint} */
  const mint = Far(makeFarName(allegedName, ERTPKind.MINT), {
    getIssuer: () => issuer,
    mintPayment: newAmount => {
      newAmount = coerce(newAmount);
      const payment = makePayment();
      paymentLedger.init(payment, newAmount);
      return payment;
    },
  });

  return harden({
    mint,
    issuer,
    amountMath: makeAmountMath(brand, amountMathKind),
    brand,
    amountMathKind,
  });
}

harden(makeIssuerKit);

export { makeIssuerKit };
