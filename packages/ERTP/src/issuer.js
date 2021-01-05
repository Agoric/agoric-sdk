// Copyright (C) 2019 Agoric, under Apache License 2.0

// @ts-check

import { assert, details } from '@agoric/assert';
import { makeExternalStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { Remotable } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { isPromise, makePromiseKit } from '@agoric/promise-kit';

import { makeAmountMath, MathKind } from './amountMath';
import { makeInterface, ERTPKind } from './interfaces';
import { coerceDisplayInfo } from './displayInfo';

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

      // Give information to UI on how to display the amount.
      getDisplayInfo: () => displayInfo,
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
    /** @type {NotifierRecord<Amount>} */
    const {
      notifier: balanceNotifier,
      updater: balanceUpdater,
    } = makeNotifierKit(currentBalance);

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
          // Move the assets in `srcPayment` into this purse, using up the
          // source payment, such that total assets are conserved.
          paymentLedger.delete(srcPayment);
          currentBalance = newPurseBalance;
          balanceUpdater.updateState(currentBalance);
          return srcPaymentBalance;
        },
        withdraw: amount => {
          amount = amountMath.coerce(amount);
          const newPurseBalance = amountMath.subtract(currentBalance, amount);
          const payment = makePayment();
          // Commit point
          // Move the withdrawn assets from this purse into a new payment
          // which is returned. Total assets must remain conserved.
          currentBalance = newPurseBalance;
          balanceUpdater.updateState(currentBalance);
          paymentLedger.init(payment, amount);
          return payment;
        },
        eventualWithdraw: searchAmount => {
          const paymentPromiseKit = makePromiseKit();
          let cancelled = false;

          const tryToFind = async lastUpdateCount => {
            if (cancelled) {
              return;
            }
            const {
              value: currentAmount,
              updateCount,
            } = await balanceNotifier.getUpdateSince(lastUpdateCount);
            const foundAmount = amountMath.find(currentAmount, searchAmount);

            if (amountMath.isEmpty(foundAmount)) {
              // searchAmount was not found, try again
              tryToFind(updateCount);
              return;
            }

            // searchAmount was found! Withdraw a payment
            paymentPromiseKit.resolve(purse.withdraw(foundAmount));
          };

          tryToFind();
          return harden({
            getPayment: () => paymentPromiseKit.promise,
            cancel: () => {
              cancelled = true;
              paymentPromiseKit.reject(
                Error('searchAmount could not be withdrawn'),
              );
            },
          });
        },
        getCurrentAmount: () => currentBalance,
        getCurrentAmountNotifier: () => balanceNotifier,
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: () => depositFacet,
      },
    );

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
            .reduce(add, empty);
          assertAmountEqual(totalPaymentsBalance, optTotalAmount);
          // Commit point.
          const [payment] = reallocate(fromPaymentsArray, [
            totalPaymentsBalance,
          ]);
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
            [srcPayment],
            [paymentAmountA, paymentAmountB],
          );
          return newPayments;
        });
      },
      splitMany: (paymentP, amounts) => {
        return E.when(paymentP, srcPayment => {
          assertKnownPayment(srcPayment);
          amounts = amounts.map(amountMath.coerce);
          // Commit point
          const newPayments = reallocate([srcPayment], amounts);
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
