// @ts-check
import { E, Far } from '@endo/far';
import { makeNotifierKit, observeIteration } from '@agoric/notifier';
import { isPromise } from '@endo/promise-kit';

import '@agoric/ertp/exported.js';
import '@agoric/notifier/exported.js';

/**
 * @template T
 * @typedef {import('@endo/far').EOnly<T>} EOnly
 */

/**
 * @typedef {object} VirtualPurseController The object that determines the
 * remote behaviour of a virtual purse.
 * @property {(amount: Amount) => Promise<void>} pushAmount Tell the controller
 * to send an amount from "us" to the "other side".  This should resolve on
 * success and reject on failure.  IT IS IMPORTANT NEVER TO FAIL in normal
 * operation.  That will irrecoverably lose assets.
 * @property {(amount: Amount) => Promise<void>} pullAmount Tell the controller
 * to send an amount from the "other side" to "us".  This should resolve on
 * success and reject on failure.  We can still recover assets from failure to
 * pull.
 * @property {(brand: Brand) => AsyncIterable<Amount>} getBalances Return the
 * current balance iterable for a given brand.
 */

/**
 * @param {ERef<VirtualPurseController>} vpc the controller that represents the
 * "other side" of this purse.
 * @param {{ issuer: ERef<Issuer>, brand: Brand, mint?: ERef<Mint>,
 * escrowPurse?: ERef<Purse> }} kit
 * the contents of the issuer kit for "us".
 *
 * If the mint is not specified, then the virtual purse will escrow local assets
 * instead of minting/burning them.  That is a better option in general, but
 * escrow doesn't support the case where the "other side" is also minting
 * assets... our escrow purse may not have enough assets in it to redeem the
 * ones that are sent from the "other side".
 * @returns {EOnly<Purse>} This is not just a Purse because it plays
 * fast-and-loose with the synchronous Purse interface.  So, the consumer of
 * this result must only interact with the virtual purse via eventual-send (to
 * conceal the methods that are returning promises instead of synchronously).
 */
function makeVirtualPurse(vpc, kit) {
  const { brand, issuer, mint, escrowPurse } = kit;

  const recoveryPurse = E(issuer).makeEmptyPurse();

  /**
   * Claim a payment for recovery via our `recoveryPurse`.  No need for this on
   * the `retain` operations (since we are just burning the payment or
   * depositing it directly in the `escrowPurse`).
   *
   * @param {ERef<Payment>} payment
   * @param {Amount} [optAmountShape]
   */
  const recoverableClaim = async (payment, optAmountShape) => {
    const pmt = await payment;
    const amt = await E(recoveryPurse).deposit(pmt, optAmountShape);
    return E(recoveryPurse).withdraw(optAmountShape || amt);
  };

  /**
   * @returns {{
   *   retain: (pmt: Payment, optAmountShape?: Pattern) => Promise<Amount>,
   *   redeem: (amt: Amount) => Promise<Payment>,
   * }}
   */
  const makeRetainRedeem = () => {
    if (mint) {
      const retain = (payment, optAmountShape = undefined) =>
        E(issuer).burn(payment, optAmountShape);
      const redeem = amount => recoverableClaim(E(mint).mintPayment(amount));
      return { retain, redeem };
    }

    // If we can't mint, then we need to escrow.
    const myEscrowPurse = escrowPurse || E(issuer).makeEmptyPurse();
    const retain = async (payment, optAmountShape = undefined) =>
      E(myEscrowPurse).deposit(payment, optAmountShape);
    const redeem = amount =>
      recoverableClaim(E(myEscrowPurse).withdraw(amount));

    return { retain, redeem };
  };

  const { retain, redeem } = makeRetainRedeem();

  /** @type {NotifierRecord<Amount>} */
  const { notifier: balanceNotifier, updater: balanceUpdater } =
    makeNotifierKit();

  /** @type {ERef<Amount>} */
  let lastBalance = E.get(balanceNotifier.getUpdateSince()).value;

  // Robustly observe the balance.
  const fail = reason => {
    balanceUpdater.fail(reason);
    const rej = Promise.reject(reason);
    rej.catch(_ => {});
    lastBalance = rej;
  };
  observeIteration(E(vpc).getBalances(brand), {
    fail,
    updateState(nonFinalValue) {
      balanceUpdater.updateState(nonFinalValue);
      lastBalance = nonFinalValue;
    },
    finish(completion) {
      balanceUpdater.finish(completion);
      lastBalance = completion;
    },
    // Propagate a failed balance properly if the iteration observer fails.
  }).catch(fail);

  /** @type {EOnly<DepositFacet>} */
  const depositFacet = Far('Virtual Deposit Facet', {
    async receive(payment, optAmountShape = undefined) {
      if (isPromise(payment)) {
        throw TypeError(
          `deposit does not accept promises as first argument. Instead of passing the promise (deposit(paymentPromise)), consider unwrapping the promise first: E.when(paymentPromise, actualPayment => deposit(actualPayment))`,
        );
      }

      const amt = await retain(payment, optAmountShape);

      // The push must always succeed.
      //
      // NOTE: There is no potential recovery protocol for failed `.pushAmount`,
      // there's no path to send a new payment back to the virtual purse holder.
      // If we don't first retain the payment, we can't be guaranteed that it is
      // the correct value, and that would be a race where somebody else might
      // claim the payment before us.
      return E(vpc)
        .pushAmount(amt)
        .then(_ => amt);
    },
  });

  /** @type {EOnly<Purse>} */
  const purse = Far('Virtual Purse', {
    deposit: depositFacet.receive,
    getAllegedBrand() {
      return brand;
    },
    getCurrentAmount() {
      return lastBalance;
    },
    getCurrentAmountNotifier() {
      return balanceNotifier;
    },
    getDepositFacet() {
      return depositFacet;
    },
    async withdraw(amount) {
      // Both ensure that the amount exists, and have the other side "send" it
      // to us.  If this fails, the balance is not affected and the withdraw
      // (properly) fails, too.
      await E(vpc).pullAmount(amount);
      // Amount has been successfully received from the other side.
      // Try to redeem the amount.
      const pmt = await redeem(amount).catch(async e => {
        // We can recover from failed redemptions... just send back what we
        // received.
        await E(vpc).pushAmount(amount);
        throw e;
      });
      return pmt;
    },
    getRecoverySet: () => E(recoveryPurse).getRecoverySet(),
    recoverAll: () => E(recoveryPurse).recoverAll(),
  });
  return purse;
}
harden(makeVirtualPurse);

export { makeVirtualPurse };
