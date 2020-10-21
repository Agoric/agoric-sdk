// Copyright (C) 2019 Agoric, under Apache License 2.0

// @ts-check

import { assert, details } from '@agoric/assert';
import { makeExternalStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { Remotable } from '@agoric/marshal';
import { isPromise } from '@agoric/promise-kit';

import { makeAmountMath, MathKind } from './amountMath';
import { makeInterface, ERTPKind } from './interfaces';

import './types';

/**
 * @param {string} allegedName
 * @param {AmountMathKind} [amountMathKind=MathKind.NAT]
 * @returns {IssuerKit}
 */
function makeIssuerKit(allegedName, amountMathKind = MathKind.NAT) {
  assert.typeof(allegedName, 'string');

  const brand = Remotable(
    makeInterface(allegedName, ERTPKind.BRAND),
    undefined,
    {
      isMyIssuer: allegedIssuerP => {
        return E.when(allegedIssuerP, allegedIssuer => {
          // eslint-disable-next-line no-use-before-define
          return allegedIssuer === issuer;
        });
      },
      getAllegedName: () => allegedName,
    },
  );

  const amountMath = makeAmountMath(brand, amountMathKind);
  const { add } = amountMath;
  const empty = amountMath.getEmpty();

  const {
    makeInstance: makePayment,
    makeWeakStore: makePaymentWeakStore,
  } = makeExternalStore('payment', () =>
    Remotable(makeInterface(allegedName, ERTPKind.PAYMENT), undefined, {
      getAllegedBrand: () => brand,
    }),
  );

  /** @type {WeakStore<Payment, Amount>} */
  const paymentLedger = makePaymentWeakStore();

  function assertKnownPayment(payment) {
    assert(
      paymentLedger.has(payment),
      details`payment not found for ${allegedName}`,
    );
  }

  // Methods like deposit() have an optional second parameter `amount`
  // which, if present, is supposed to be equal to the balance of the
  // payment. This helper function does that check.
  const assertAmountEqual = (paymentBalance, amount) => {
    if (amount !== undefined) {
      assert(
        amountMath.isEqual(amount, paymentBalance),
        details`payment balance ${paymentBalance} must equal amount ${amount}`,
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
      Remotable(makeInterface(allegedName, ERTPKind.DEPOSIT_FACET), undefined, {
        receive: purse.deposit,
      }),
  );

  const { makeInstance: makePurse } = makeExternalStore('purse', () => {
    let currentBalance = amountMath.getEmpty();

    /** @type {Purse} */
    const purse = Remotable(
      makeInterface(allegedName, ERTPKind.PURSE),
      undefined,
      {
        deposit: (srcPayment, optAmount = undefined) => {
          if (isPromise(srcPayment)) {
            throw new TypeError(
              `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: paymentPromise.then(actualPayment => deposit(actualPayment))`,
            );
          }
          assertKnownPayment(srcPayment);
          const srcPaymentBalance = paymentLedger.get(srcPayment);
          // Note: this does not guarantee that optAmount itself is a valid stable amount
          assertAmountEqual(srcPaymentBalance, optAmount);
          const newPurseBalance = amountMath.add(
            srcPaymentBalance,
            currentBalance,
          );
          // Commit point
          paymentLedger.delete(srcPayment);
          currentBalance = newPurseBalance;
          return srcPaymentBalance;
        },
        withdraw: amount => {
          amount = amountMath.coerce(amount);
          const newPurseBalance = amountMath.subtract(currentBalance, amount);
          // Commit point
          currentBalance = newPurseBalance;
          const payment = makePayment();
          paymentLedger.init(payment, amount);
          return payment;
        },
        getCurrentAmount: () => currentBalance,
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: () => depositFacet,
      },
    );

    const depositFacet = makeDepositFacet(purse);
    return purse;
  });

  // Amount in circulation remains constant with reallocate.
  const reallocate = ({ payments = [], newPaymentBalances = [] }) => {
    // There may be zero, one, or many payments as input to
    // reallocate. We want to protect against someone passing in
    // what appears to be multiple payments that turn out to actually
    // be the same payment (an aliasing issue). The `combine` method
    // legitimately needs to take in multiple payments, but we don't
    // need to pay the costs of protecting against aliasing for the
    // other uses.

    if (payments.length > 1) {
      const paymentSet = new Set();
      payments.forEach(payment => {
        if (paymentSet.has(payment)) {
          throw new Error('same payment seen twice');
        }
        paymentSet.add(payment);
      });
    }

    const total = payments.map(paymentLedger.get).reduce(add, empty);

    const newTotal = newPaymentBalances.reduce(add, empty);

    // Invariant check
    assert(amountMath.isEqual(total, newTotal), 'rights were not conserved');

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
  const issuer = Remotable(
    makeInterface(allegedName, ERTPKind.ISSUER),
    undefined,
    {
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
          const [payment] = reallocate(
            harden({
              payments: [srcPayment],
              newPaymentBalances: [srcPaymentBalance],
            }),
          );
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
            .reduce(add, empty);
          assertAmountEqual(totalPaymentsBalance, optTotalAmount);
          // Commit point.
          const [payment] = reallocate(
            harden({
              payments: fromPaymentsArray,
              newPaymentBalances: [totalPaymentsBalance],
            }),
          );
          return payment;
        });
      },
      // payment to two payments, A and B
      split: (paymentP, paymentAmountA) => {
        return E.when(paymentP, srcPayment => {
          paymentAmountA = amountMath.coerce(paymentAmountA);
          assertKnownPayment(srcPayment);
          const srcPaymentBalance = paymentLedger.get(srcPayment);
          const paymentAmountB = amountMath.subtract(
            srcPaymentBalance,
            paymentAmountA,
          );
          // Commit point
          const newPayments = reallocate(
            harden({
              payments: [srcPayment],
              newPaymentBalances: [paymentAmountA, paymentAmountB],
            }),
          );
          return newPayments;
        });
      },
      splitMany: (paymentP, amounts) => {
        return E.when(paymentP, srcPayment => {
          assertKnownPayment(srcPayment);
          amounts = amounts.map(amountMath.coerce);
          // Commit point
          const newPayments = reallocate(
            harden({
              payments: [srcPayment],
              newPaymentBalances: amounts,
            }),
          );
          return newPayments;
        });
      },
    },
  );

  /** @type {Mint} */
  const mint = Remotable(makeInterface(allegedName, ERTPKind.MINT), undefined, {
    getIssuer: () => issuer,
    mintPayment: newAmount => {
      newAmount = amountMath.coerce(newAmount);
      const payment = makePayment();
      paymentLedger.init(payment, newAmount);
      return payment;
    },
  });

  return harden({
    mint,
    issuer,
    amountMath,
    brand,
  });
}

harden(makeIssuerKit);

export { makeIssuerKit };
