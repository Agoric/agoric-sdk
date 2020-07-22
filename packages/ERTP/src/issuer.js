// Copyright (C) 2019 Agoric, under Apache License 2.0

// @ts-check

import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/weak-store';
import { isPromise } from '@agoric/produce-promise';

import makeAmountMath from './amountMath';

/**
 *
 * @param {string} allegedName
 * @param {string} mathHelpersName
 * @returns {IssuerKit}
 */
function makeIssuerKit(allegedName, mathHelpersName = 'nat') {
  assert.typeof(allegedName, 'string');

  const brand = harden({
    // eslint-disable-next-line no-use-before-define
    isMyIssuer: allegedIssuer => allegedIssuer === issuer,
    getAllegedName: () => allegedName,
  });

  const amountMath = makeAmountMath(brand, mathHelpersName);

  const paymentLedger = makeStore('payment');
  const purseLedger = makeStore('purse');

  function assertKnownPayment(payment) {
    assert(
      paymentLedger.has(payment),
      details`payment not found for ${allegedName}`,
    );
  }

  const makePayment = () =>
    harden({
      getAllegedBrand: () => brand,
    });

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

  const makePurse = () => {
    const purse = harden({
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
        const purseBalance = purse.getCurrentAmount();
        const newPurseBalance = amountMath.add(srcPaymentBalance, purseBalance);
        // Commit point
        // eslint-disable-next-line no-use-before-define
        const payments = reallocate(
          harden({
            payments: [srcPayment],
            purses: [purse],
            newPurseBalances: [newPurseBalance],
          }),
        );
        assert(payments.length === 0, 'no payments should be returned');
        return srcPaymentBalance;
      },
      withdraw: amount => {
        amount = amountMath.coerce(amount);
        const purseBalance = purse.getCurrentAmount();
        const newPurseBalance = amountMath.subtract(purseBalance, amount);
        // Commit point
        // eslint-disable-next-line no-use-before-define
        const [payment] = reallocate(
          harden({
            purses: [purse],
            newPurseBalances: [newPurseBalance],
            newPaymentBalances: [amount],
          }),
        );
        return payment;
      },
      getCurrentAmount: () => purseLedger.get(purse),
      getAllegedBrand: () => brand,
      makeDepositFacet: () => harden({ receive: purse.deposit }),
    });
    return purse;
  };

  const { add } = amountMath;
  const empty = amountMath.getEmpty();

  // Amount in circulation remains constant with reallocate.
  const reallocate = ({
    purses = [],
    payments = [],
    newPurseBalances = [],
    newPaymentBalances = [],
  }) => {
    // There may be zero or one purse and no more. No methods pass in
    // more than one purse.
    assert(
      purses.length === 0 || purses.length === 1,
      'purses length must be 0 or 1',
    );

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

    assert(
      purses.length === newPurseBalances.length,
      details`purses and newPurseBalances should have same length`,
    );

    const totalPursesB = purses.map(purseLedger.get).reduce(add, empty);
    const totalPaymentsB = payments.map(paymentLedger.get).reduce(add, empty);
    const total = amountMath.add(totalPursesB, totalPaymentsB);

    const newPursesTotal = newPurseBalances.reduce(add, empty);
    const newPaymentsTotal = newPaymentBalances.reduce(add, empty);
    const newTotal = amountMath.add(newPaymentsTotal, newPursesTotal);

    // Invariant check
    assert(amountMath.isEqual(total, newTotal), 'rights were not conserved');

    // commit point
    payments.forEach(payment => paymentLedger.delete(payment));
    purses.forEach((purse, i) => purseLedger.set(purse, newPurseBalances[i]));

    const newPayments = newPaymentBalances.map(balance => {
      const newPayment = makePayment();
      paymentLedger.init(newPayment, balance);
      return newPayment;
    });

    return harden(newPayments);
  };

  const issuer = harden({
    getBrand: () => brand,
    getAllegedName: () => allegedName,
    getAmountMath: () => amountMath,
    getMathHelpersName: () => mathHelpersName,
    makeEmptyPurse: () => {
      const purse = makePurse();
      purseLedger.init(purse, amountMath.getEmpty());
      return purse;
    },

    isLive: paymentP => {
      return Promise.resolve(paymentP).then(payment => {
        return paymentLedger.has(payment);
      });
    },
    getAmountOf: paymentP => {
      return Promise.resolve(paymentP).then(payment => {
        assertKnownPayment(payment);
        return paymentLedger.get(payment);
      });
    },

    burn: (paymentP, optAmount = undefined) => {
      return Promise.resolve(paymentP).then(payment => {
        assertKnownPayment(payment);
        const paymentBalance = paymentLedger.get(payment);
        assertAmountEqual(paymentBalance, optAmount);
        // Commit point.
        paymentLedger.delete(payment);
        return paymentBalance;
      });
    },
    claim: (paymentP, optAmount = undefined) => {
      return Promise.resolve(paymentP).then(srcPayment => {
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
      return Promise.resolve(paymentP).then(srcPayment => {
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
      return Promise.resolve(paymentP).then(srcPayment => {
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
  });

  const mint = harden({
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

export default makeIssuerKit;
