// Copyright (C) 2019 Agoric, under Apache License 2.0
// @ts-check

import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/weak-store';
import { isPromise } from '@agoric/produce-promise';

import makeAmountMath from './amountMath';

/**
 * @typedef {import('./amountMath').Amount} Amount
 * @typedef {import('./amountMath').Extent} Extent
 * @typedef {import('./amountMath').AmountMath} AmountMath
 * @typedef {Payment|Promise<Payment>} PaymentP
 */

/**
 * @typedef {Object} Issuer
 * The issuer cannot mint a new amount, but it can create empty purses and
 * payments. The issuer can also transform payments (splitting payments,
 * combining payments, burning payments, and claiming payments
 * exclusively). The issuer should be gotten from a trusted source and
 * then relied upon as the decider of whether an untrusted payment is valid.
 *
 * @property {() => Brand} getBrand Get the Brand for this Issuer. The Brand indicates the kind of
 * digital asset and is shared by the mint, the issuer, and any purses
 * and payments of this particular kind. The brand is not closely
 * held, so this function should not be trusted to identify an issuer
 * alone. Fake digital assets and amount can use another issuer's brand.
 *
 * @property {() => string} getAllegedName Get the allegedName for this mint/issuer
 * @property {() => AmountMath} getAmountMath Get the AmountMath for this Issuer.
 * @property {() => string} getMathHelpersName Get the name of the MathHelpers for this Issuer.
 * @property {() => Purse} makeEmptyPurse Make an empty purse of this brand.
 * @property {(payment: PaymentP) => Promise<boolean>} isLive
 * Return true if the payment continues to exist.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP) => Promise<Amount>} getAmountOf
 * Get the amount of digital assets in the payment. Because the
 * payment is not trusted, we cannot call a method on it directly,
 * and must use the issuer instead.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, optAmount?: Amount) => Promise<Amount>} burn
 * Burn all of the digital assets in the payment. `optAmount` is optional.
 * If `optAmount` is present, the code will insist that the amount of
 * the digital assets in the payment is equal to `optAmount`, to
 * prevent sending the wrong payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, optAmount?: Amount) => Promise<Payment>} claim
 * Transfer all digital assets from the payment to a new payment and
 * delete the original. `optAmount` is optional.
 * If `optAmount` is present, the code will insist that the amount of
 * digital assets in the payment is equal to `optAmount`, to prevent
 * sending the wrong  payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(paymentsArray: PaymentP[]) => Promise<Payment>} combine
 * Combine multiple payments into one payment.
 *
 * If any of the payments is a promise, the operation will proceed upon
 * resolution.
 *
 * @property {(payment: PaymentP, paymentAmountA: Amount) => Promise<Payment[]>} split
 * Split a single payment into two payments, A and B, according to the
 * paymentAmountA passed in.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, amounts: Amount[]) => Promise<Payment[]>} splitMany
 * Split a single payment into many payments, according to the
 * amounts passed in.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 */

/**
 * @typedef {Object} Brand
 * The Brand indicates the kind of digital asset and is shared by
 * the mint, the issuer, and any purses and payments of this
 * particular kind. Fake digital assets and amount can use another
 * issuer's brand.
 *
 * @property {(allegedIssuer: any) => boolean} isMyIssuer Should be used with
 * `issuer.getBrand` to ensure an issuer and brand match.
 * @property {() => string} getAllegedName
 */

/**
 * @typedef {Object} IssuerMaker
 * Makes Issuers.
 *
 * @property {(allegedName: string, mathHelperName: string) => IssuerResults} produceIssuer
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The mathHelpersName will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 * @typedef {Object} IssuerResults
 * The return value of produceIssuer
 *
 * @property {Mint} mint
 * @property {Issuer} issuer
 * @property {AmountMath} amountMath
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Mint
 * Holding a Mint carries the right to issue new digital assets. These
 * assets all have the same kind, which is called a Brand.
 *
 * @property {() => Issuer} getIssuer Gets the Issuer for this mint.
 * @property {(newAmount: Amount) => Payment} mintPayment
 * Creates a new Payment containing newly minted amount.
 */

/**
 * @typedef {Object} Purse
 * Purses hold amount of digital assets of the same brand, but unlike Payments, they are
 * not meant to be sent to others. To transfer digital assets, a
 * Payment should be withdrawn from a Purse. The amount of digital
 * assets in a purse can change through the action of deposit() and withdraw().
 *
 * The primary use for Purses and Payments is for currency-like and goods-like
 * digital assets, but they can also be used to represent other kinds of rights, such
 * as the right to participate in a particular contract.
 *
 * @property {() => Brand} getAllegedBrand Get the alleged Brand for this Purse
 *
 * @property {() => Amount} getCurrentAmount
 * Get the amount contained in this purse, confirmed by the issuer.
 *
 * @property {(payment: PaymentP, optAmount?: Amount) => Amount} deposit
 * Deposit all the contents of payment into this purse, returning the
 * amount. If the optional argument `optAmount` does not equal the
 * amount of digital assets in the payment, throw an error.
 *
 * If payment is an unresolved promise, throw an error.
 *
 * @property {(amount: Amount) => Payment} withdraw
 * Withdraw amount from this purse into a new Payment.
 */

/**
 * @typedef {Object} Payment
 * Payments hold amount of digital assets of the same brand in transit. Payments can
 * be deposited in purses, split into multiple payments, combined, and
 * claimed (getting an exclusive payment). Payments are linear, meaning
 * that either a payment has the same amount of digital assets it
 * started with, or it is used up entirely. It is impossible to partially use a payment.
 *
 * Payments are often received from other actors and therefore should
 * not be trusted themselves. To get the amount of digital assets in a payment, use the
 * trusted issuer: issuer.getAmountOf(payment),
 *
 * Payments can be converted to Purses by getting a trusted issuer and
 * calling `issuer.makeEmptyPurse()` to create a purse, then `purse.deposit(payment)`.
 *
 * @property {() => Brand} getAllegedBrand
 * Get the allegedBrand, indicating the kind of digital asset this
 * payment purports to be, and which issuer to use. Because payments
 * are not trusted, any method calls on payments should be treated
 * with suspicion and verified elsewhere.
 */

/**
 * @typedef {Object} MathHelpers
 * All of the difference in how digital asset amount are manipulated can be reduced to
 * the behavior of the math on extents. We extract this
 * custom logic into mathHelpers. MathHelpers are about extent
 * arithmetic, whereas AmountMath is about amounts, which are the
 * extents labeled with a brand. AmountMath use mathHelpers to do their extent arithmetic,
 * and then brand the results, making a new amount.
 *
 * @property {(allegedExtent: Extent) => Extent} doCoerce
 * Check the kind of this extent and throw if it is not the
 * expected kind.
 *
 * @property {() => Extent} doGetEmpty
 * Get the representation for the identity element (often 0 or an
 * empty array)
 *
 * @property {(extent: Extent) => boolean} doIsEmpty
 * Is the extent the identity element?
 *
 * @property {(left: Extent, right: Extent) => boolean} doIsGTE
 * Is the left greater than or equal to the right?
 *
 * @property {(left: Extent, right: Extent) => boolean} doIsEqual
 * Does left equal right?
 *
 * @property {(left: Extent, right: Extent) => Extent} doAdd
 * Return the left combined with the right.
 *
 * @property {(left: Extent, right: Extent) => Extent} doSubtract
 * Return what remains after removing the right from the left. If
 * something in the right was not in the left, we throw an error.
 */

/**
 *
 * @param {string} allegedName
 * @param {string} mathHelpersName
 */
function produceIssuer(allegedName, mathHelpersName = 'nat') {
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
        return newPurseBalance;
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

harden(produceIssuer);

export default produceIssuer;
