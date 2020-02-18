// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/weak-store';
import { E } from '@agoric/eventual-send';

import makeAmountMath from './amountMath';

function produceIssuer(allegedName, mathHelpersName = 'nat') {
  assert(allegedName, details`allegedName must be truthy: ${allegedName}`);

  const brand = harden({
    // eslint-disable-next-line no-use-before-define
    isMyIssuer: allegedIssuer => allegedIssuer === issuer,
    allegedName: () => allegedName,
  });

  const amountMath = makeAmountMath(brand, mathHelpersName);

  const paymentLedger = makeStore('payment');
  const purseLedger = makeStore('purse');

  const makePayment = () =>
    harden({
      allegedBrand: () => brand,
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
      deposit: (paymentP, optAmount = undefined) => {
        const srcPayment = E.unwrap(paymentP);
        const srcPaymentBalance = paymentLedger.get(srcPayment);
        assertAmountEqual(srcPaymentBalance, optAmount);
        const purseBalance = purse.getBalance();
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
        return newPurseBalance;
      },
      withdraw: amount => {
        const purseBalance = purse.getBalance();
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
      getBalance: () => purseLedger.get(purse),
      allegedBrand: () => brand,
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

    const totalPursesB = purses.map(purseLedger.get).reduce(add, empty);
    const totalPaymentsB = payments.map(paymentLedger.get).reduce(add, empty);
    const total = amountMath.add(totalPursesB, totalPaymentsB);

    const newPaymentsTotal = newPaymentBalances.reduce(add, empty);
    const newPursesTotal = newPurseBalances.reduce(add, empty);
    const newTotal = amountMath.add(newPaymentsTotal, newPursesTotal);

    // Invariant check
    assert(amountMath.isEqual(total, newTotal), 'rights were not conserved');

    // commit point
    payments.map(payment => paymentLedger.delete(payment));
    purses.map((purse, i) => purseLedger.set(purse, newPurseBalances[i]));

    const newPayments = newPaymentBalances.map(balance => {
      const newPayment = makePayment();
      paymentLedger.init(newPayment, balance);
      return newPayment;
    });

    return harden(newPayments);
  };

  const issuer = harden({
    getBrand: () => brand,
    allegedName: () => allegedName,
    getAmountMath: () => amountMath,
    getMathHelpersName: () => mathHelpersName,
    makeEmptyPurse: () => {
      const purse = makePurse();
      purseLedger.init(purse, amountMath.getEmpty());
      return purse;
    },
    isLive: paymentLedger.has,
    getBalance: paymentLedger.get,
    burn: (paymentP, optAmount = undefined) => {
      const payment = E.unwrap(paymentP);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountEqual(paymentBalance, optAmount);
      paymentLedger.delete(payment);
      return paymentBalance;
    },
    claim: (paymentP, optAmount) => {
      const srcPayment = E.unwrap(paymentP);
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
    },
    combine: (fromPaymentsPArray, totalAmount) => {
      const fromPaymentsArray = fromPaymentsPArray.map(E.unwrap);
      const totalPaymentsB = fromPaymentsArray
        .map(paymentLedger.get)
        .reduce(add, empty);
      assertAmountEqual(totalPaymentsB, totalAmount);
      // Commit point.
      const [payment] = reallocate(
        harden({
          payments: fromPaymentsArray,
          newPaymentBalances: [totalPaymentsB],
        }),
      );
      return payment;
    },
    // payment to two payments, A and B
    split: (paymentP, paymentAmountA) => {
      const srcPayment = E.unwrap(paymentP);
      paymentAmountA = amountMath.coerce(paymentAmountA);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      const paymentAmountB = amountMath.subtract(
        srcPaymentBalance,
        paymentAmountA,
      );
      const amounts = harden([paymentAmountA, paymentAmountB]);
      // Commit point
      const newPayments = reallocate(
        harden({
          payments: [srcPayment],
          newPaymentBalances: amounts,
        }),
      );
      return newPayments;
    },
    splitMany: (paymentP, amounts) => {
      const srcPayment = E.unwrap(paymentP);
      amounts = amounts.map(amountMath.coerce);
      // Commit point
      const newPayments = reallocate(
        harden({
          payments: [srcPayment],
          newPaymentBalances: amounts,
        }),
      );
      return newPayments;
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

harden(produceIssuer);

export default produceIssuer;
