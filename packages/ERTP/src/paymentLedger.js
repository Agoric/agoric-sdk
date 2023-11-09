// @jessie-check

/* eslint-disable no-use-before-define */
import { isPromise } from '@endo/promise-kit';
import { mustMatch, M, keyEQ } from '@agoric/store';
import {
  provideDurableWeakMapStore,
  prepareExo,
  provide,
} from '@agoric/vat-data';
import { AmountMath } from './amountMath.js';
import { preparePaymentKind } from './payment.js';
import { preparePurseKind } from './purse.js';

import '@agoric/store/exported.js';
import { BrandI, makeIssuerInterfaces } from './typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { details: X, quote: q, Fail } = assert;

/**
 * @param {Brand} brand
 * @param {AssetKind} assetKind
 * @param {Pattern} elementShape
 */
const amountShapeFromElementShape = (brand, assetKind, elementShape) => {
  let valueShape;
  switch (assetKind) {
    case 'nat': {
      valueShape = M.nat();
      elementShape === undefined ||
        Fail`Fungible assets cannot have an elementShape: ${q(elementShape)}`;
      break;
    }
    case 'set': {
      if (elementShape === undefined) {
        valueShape = M.arrayOf(M.key());
      } else {
        valueShape = M.arrayOf(M.and(M.key(), elementShape));
      }
      break;
    }
    case 'copySet': {
      if (elementShape === undefined) {
        valueShape = M.set();
      } else {
        valueShape = M.setOf(elementShape);
      }
      break;
    }
    case 'copyBag': {
      if (elementShape === undefined) {
        valueShape = M.bag();
      } else {
        valueShape = M.bagOf(elementShape);
      }
      break;
    }
    default: {
      Fail`unexpected asset kind ${q(assetKind)}`;
    }
  }

  const amountShape = harden({
    brand, // matches only this exact brand
    value: valueShape,
  });
  return amountShape;
};

/**
 * Make the paymentLedger, the source of truth for the balances of payments. All
 * minting and transfer authority originates here.
 *
 * @template {AssetKind} K
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {K} assetKind
 * @param {DisplayInfo<K>} displayInfo
 * @param {Pattern} elementShape
 * @param {ShutdownWithFailure} [optShutdownWithFailure]
 * @returns {PaymentLedger<K>}
 */
export const preparePaymentLedger = (
  issuerBaggage,
  name,
  assetKind,
  displayInfo,
  elementShape,
  optShutdownWithFailure = undefined,
) => {
  /** @type {Brand<K>} */
  // @ts-expect-error XXX callWhen
  const brand = prepareExo(issuerBaggage, `${name} brand`, BrandI, {
    isMyIssuer(allegedIssuer) {
      // BrandI delays calling this method until `allegedIssuer` is a Remotable
      return allegedIssuer === issuer;
    },
    getAllegedName() {
      return name;
    },
    // Give information to UI on how to display the amount.
    getDisplayInfo() {
      return displayInfo;
    },
    getAmountShape() {
      return amountShape;
    },
  });

  const amountShape = amountShapeFromElementShape(
    brand,
    assetKind,
    elementShape,
  );

  const { IssuerI, MintI, PaymentI, PurseIKit } = makeIssuerInterfaces(
    brand,
    assetKind,
    amountShape,
  );

  const makePayment = preparePaymentKind(issuerBaggage, name, brand, PaymentI);

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
    { valueShape: amountShape },
  );

  /**
   * A withdrawn live payment is associated with the recovery set of the purse
   * it was withdrawn from. Let's call these "recoverable" payments. All
   * recoverable payments are live, but not all live payments are recoverable.
   * We do the bookkeeping for payment recovery with this weakmap from
   * recoverable payments to the recovery set they are in. A bunch of
   * interesting invariants here:
   *
   * - Every payment that is a key in the outer `paymentRecoverySets` weakMap is
   *   also in the recovery set indexed by that payment.
   * - Implied by the above but worth stating: the payment is only in at most one
   *   recovery set.
   * - A recovery set only contains such payments.
   * - Every purse is associated with exactly one recovery set unique to it.
   * - A purse's recovery set only contains payments withdrawn from that purse and
   *   not yet consumed.
   *
   * @type {WeakMapStore<Payment, SetStore<Payment>>}
   */
  const paymentRecoverySets = provideDurableWeakMapStore(
    issuerBaggage,
    'paymentRecoverySets',
  );

  /**
   * To maintain the invariants listed in the `paymentRecoverySets` comment,
   * `initPayment` should contain the only call to `paymentLedger.init`.
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
   * `deletePayment` should contain the only call to `paymentLedger.delete`.
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

  /** @type {(left: Amount, right: Amount) => Amount} */
  const add = (left, right) => AmountMath.add(left, right, brand);
  /** @type {(left: Amount, right: Amount) => Amount} */
  const subtract = (left, right) => AmountMath.subtract(left, right, brand);
  /** @type {(allegedAmount: Amount) => Amount} */
  const coerce = allegedAmount => AmountMath.coerce(brand, allegedAmount);
  /** @type {(left: Amount, right: Amount) => boolean} */

  /**
   * Methods like deposit() have an optional second parameter `optAmountShape`
   * which, if present, is supposed to match the balance of the payment. This
   * helper function does that check.
   *
   * Note: `optAmountShape` is user-supplied with no previous validation.
   *
   * @param {Amount} paymentBalance
   * @param {Pattern} [optAmountShape]
   * @returns {void}
   */
  const assertAmountConsistent = (paymentBalance, optAmountShape) => {
    if (optAmountShape !== undefined) {
      mustMatch(paymentBalance, optAmountShape, 'amount');
    }
  };

  /**
   * @param {Payment} payment
   * @returns {void}
   */
  const assertLivePayment = payment => {
    paymentLedger.has(payment) ||
      Fail`${payment} was not a live payment for brand ${q(
        brand,
      )}. It could be a used-up payment, a payment for another brand, or it might not be a payment at all.`;
  };

  /**
   * Used by the purse code to implement purse.deposit
   *
   * @param {Amount} currentBalance - the current balance of the purse before a
   *   deposit
   * @param {(newPurseBalance: Amount) => void} updatePurseBalance - commit the
   *   purse balance
   * @param {Payment} srcPayment
   * @param {Pattern} [optAmountShape]
   * @returns {Amount}
   */
  const depositInternal = (
    currentBalance,
    updatePurseBalance,
    srcPayment,
    optAmountShape = undefined,
  ) => {
    !isPromise(srcPayment) ||
      assert.fail(
        `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: E.when(paymentPromise, (actualPayment => deposit(actualPayment))`,
        TypeError,
      );
    assertLivePayment(srcPayment);
    const srcPaymentBalance = paymentLedger.get(srcPayment);
    assertAmountConsistent(srcPaymentBalance, optAmountShape);
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
   * @param {Amount} currentBalance - the current balance of the purse before a
   *   withdrawal
   * @param {(newPurseBalance: Amount) => void} updatePurseBalance - commit the
   *   purse balance
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
    AmountMath.isGTE(currentBalance, amount) ||
      Fail`Withdrawal of ${amount} failed because the purse only contained ${currentBalance}`;
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

  /** @type {() => Purse<K>} */
  // @ts-expect-error type parameter confusion
  const makeEmptyPurse = preparePurseKind(
    issuerBaggage,
    name,
    assetKind,
    brand,
    PurseIKit,
    harden({
      depositInternal,
      withdrawInternal,
    }),
  );

  /** @type {Issuer<K>} */
  // @ts-expect-error cast due to callWhen discrepancy
  const issuer = prepareExo(issuerBaggage, `${name} issuer`, IssuerI, {
    getBrand() {
      return brand;
    },
    getAllegedName() {
      return name;
    },
    getAssetKind() {
      return assetKind;
    },
    getDisplayInfo() {
      return displayInfo;
    },
    makeEmptyPurse() {
      return makeEmptyPurse();
    },
    /** @param {Payment} payment awaited by callWhen */
    isLive(payment) {
      // IssuerI delays calling this method until `payment` is a Remotable
      return paymentLedger.has(payment);
    },
    /** @param {Payment} payment awaited by callWhen */
    getAmountOf(payment) {
      // IssuerI delays calling this method until `payment` is a Remotable
      assertLivePayment(payment);
      return paymentLedger.get(payment);
    },
    /**
     * @param {Payment} payment awaited by callWhen
     * @param {Pattern} optAmountShape
     */
    burn(payment, optAmountShape = undefined) {
      // IssuerI delays calling this method until `payment` is a Remotable
      assertLivePayment(payment);
      const paymentBalance = paymentLedger.get(payment);
      assertAmountConsistent(paymentBalance, optAmountShape);
      try {
        // COMMIT POINT.
        deletePayment(payment);
      } catch (err) {
        shutdownLedgerWithFailure(err);
        throw err;
      }
      return paymentBalance;
    },
  });

  /**
   * Provides for the recovery of newly minted but not-yet-deposited payments.
   *
   * Because the `mintRecoveryPurse` is placed in baggage, even if the caller of
   * `makeIssuerKit` drops it on the floor, it can still be recovered in an
   * emergency upgrade.
   *
   * @type {Purse<K>}
   */
  const mintRecoveryPurse = provide(issuerBaggage, 'mintRecoveryPurse', () =>
    makeEmptyPurse(),
  );

  /** @type {Mint<K>} */
  const mint = prepareExo(issuerBaggage, `${name} mint`, MintI, {
    getIssuer() {
      return issuer;
    },
    mintPayment(newAmount) {
      // @ts-expect-error checked cast
      newAmount = coerce(newAmount);
      mustMatch(newAmount, amountShape, 'minted amount');
      // `rawPayment` is not associated with any recovery set, and
      // so must not escape.
      const rawPayment = makePayment();
      initPayment(rawPayment, newAmount, undefined);

      const mintRecoveryPurseBefore = mintRecoveryPurse.getCurrentAmount();
      mintRecoveryPurse.deposit(rawPayment, newAmount);
      const payment = mintRecoveryPurse.withdraw(newAmount);
      const mintRecoveryPurseAfter = mintRecoveryPurse.getCurrentAmount();
      assert(keyEQ(mintRecoveryPurseBefore, mintRecoveryPurseAfter));
      return payment;
    },
  });

  const issuerKit = harden({ issuer, mint, brand, mintRecoveryPurse });
  return issuerKit;
};
harden(preparePaymentLedger);
