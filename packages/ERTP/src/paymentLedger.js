/* eslint-disable no-use-before-define */
// @ts-check

import { E } from '@endo/eventual-send';
import { isPromise } from '@endo/promise-kit';
import { assertCopyArray } from '@endo/marshal';
import { fit, M } from '@agoric/store';
import { vivifySingleton, provideDurableWeakMapStore } from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { vivifyPaymentKind } from './payment.js';
import { vivifyPurseKind } from './purse.js';

import '@agoric/store/exported.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { details: X, quote: q } = assert;

const amountSchemaFromElementSchema = (brand, assetKind, elementSchema) => {
  let valueSchema;
  switch (assetKind) {
    case 'nat': {
      valueSchema = M.nat();
      assert(
        elementSchema === undefined,
        X`Fungible assets cannot have an elementSchema: ${q(elementSchema)}`,
      );
      break;
    }
    case 'set': {
      if (elementSchema === undefined) {
        valueSchema = M.arrayOf(M.key());
      } else {
        valueSchema = M.arrayOf(M.and(M.key(), elementSchema));
      }
      break;
    }
    case 'copySet': {
      if (elementSchema === undefined) {
        valueSchema = M.set();
      } else {
        valueSchema = M.setOf(elementSchema);
      }
      break;
    }
    case 'copyBag': {
      if (elementSchema === undefined) {
        valueSchema = M.bag();
      } else {
        valueSchema = M.bagOf(elementSchema);
      }
      break;
    }
    default: {
      assert.fail(X`unexpected asset kind ${q(assetKind)}`);
    }
  }

  const amountSchema = harden({
    brand, // matches only this exact brand
    value: valueSchema,
  });
  return amountSchema;
};

/**
 * Make the paymentLedger, the source of truth for the balances of
 * payments. All minting and transfer authority originates here.
 *
 * @template {AssetKind} [K=AssetKind]
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {AssetKind} assetKind
 * @param {DisplayInfo} displayInfo
 * @param {Pattern} elementSchema
 * @param {ShutdownWithFailure=} optShutdownWithFailure
 * @returns {{ issuer: Issuer<K>, mint: Mint<K>, brand: Brand<K> }}
 */
export const vivifyPaymentLedger = (
  issuerBaggage,
  name,
  assetKind,
  displayInfo,
  elementSchema,
  optShutdownWithFailure = undefined,
) => {
  const getBrand = () => brand;

  const makePayment = vivifyPaymentKind(issuerBaggage, name, getBrand);

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
  const paymentLedger = provideDurableWeakMapStore(
    issuerBaggage,
    'paymentLedger',
  );

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
  const paymentRecoverySets = provideDurableWeakMapStore(
    issuerBaggage,
    'paymentRecoverySets',
  );

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

  /**
   * Methods like deposit() have an optional second parameter
   * `optAmountSchema`
   * which, if present, is supposed to match the balance of the
   * payment. This helper function does that check.
   *
   * Note: `optAmountSchema` is user-supplied with no previous validation.
   *
   * @param {Amount} paymentBalance
   * @param {Pattern=} optAmountSchema
   * @returns {void}
   */
  const assertAmountConsistent = (paymentBalance, optAmountSchema) => {
    if (optAmountSchema !== undefined) {
      fit(paymentBalance, optAmountSchema, 'amount');
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
          X`same payment ${payment} seen twice`,
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
  const burn = (paymentP, optAmountSchema = undefined) => {
    return E.when(paymentP, payment => {
      assertLivePayment(payment);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountConsistent(paymentBalance, optAmountSchema);
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
  const claim = (paymentP, optAmountSchema = undefined) => {
    return E.when(paymentP, srcPayment => {
      assertLivePayment(srcPayment);
      const srcPaymentBalance = paymentLedger.get(srcPayment);
      assertAmountConsistent(srcPaymentBalance, optAmountSchema);
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
    fit(newAmount, amountSchema, 'minted amount');
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
   * @param {Pattern=} optAmountSchema
   * @returns {Amount}
   */
  const depositInternal = (
    currentBalance,
    updatePurseBalance,
    srcPayment,
    optAmountSchema = undefined,
  ) => {
    assert(
      !isPromise(srcPayment),
      `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: E.when(paymentPromise, (actualPayment => deposit(actualPayment))`,
      TypeError,
    );
    assertLivePayment(srcPayment);
    const srcPaymentBalance = paymentLedger.get(srcPayment);
    assertAmountConsistent(srcPaymentBalance, optAmountSchema);
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

  const makeEmptyPurse = vivifyPurseKind(
    issuerBaggage,
    name,
    assetKind,
    getBrand,
    harden({
      depositInternal,
      withdrawInternal,
    }),
  );

  const issuer = vivifySingleton(issuerBaggage, `${name} issuer`, {
    getBrand: () => brand,
    getAllegedName: () => name,
    getAssetKind: () => assetKind,
    getDisplayInfo: () => displayInfo,
    makeEmptyPurse,

    isLive,
    getAmountOf,
    burn,
    claim,
    combine,
    split,
    splitMany,
  });

  const mint = vivifySingleton(issuerBaggage, `${name} mint`, {
    getIssuer: () => issuer,
    mintPayment,
  });

  const brand = /** @type {Brand} */ (
    vivifySingleton(issuerBaggage, `${name} brand`, {
      isMyIssuer: allegedIssuerP =>
        E.when(allegedIssuerP, allegedIssuer => allegedIssuer === issuer),

      getAllegedName: () => name,
      // Give information to UI on how to display the amount.
      getDisplayInfo: () => displayInfo,
      getAmountSchema: () => amountSchema,
    })
  );

  const issuerKit = harden({ issuer, mint, brand });

  const emptyAmount = AmountMath.makeEmpty(brand, assetKind);
  const amountSchema = amountSchemaFromElementSchema(
    brand,
    assetKind,
    elementSchema,
  );
  return issuerKit;
};
harden(vivifyPaymentLedger);

/** @typedef {ReturnType<typeof vivifyPaymentLedger>} PaymentLedger */
