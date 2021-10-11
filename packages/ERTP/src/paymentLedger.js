// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isPromise } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
import { makeWeakStore } from '@agoric/store';

import { AmountMath } from './amountMath.js';
import { makePayment } from './payment.js';
import { makePurse } from './purse.js';

import '@agoric/store/exported.js';

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
    assert(
      paymentLedger.has(payment),
      X`payment not found for ${allegedName}; got ${payment}`,
    );
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
    assert(
      AmountMath.isGTE(currentBalance, amount),
      X`Withdrawal of ${amount} failed because the purse only contained ${currentBalance}`,
    );
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
