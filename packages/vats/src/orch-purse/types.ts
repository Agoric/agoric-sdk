/* eslint-disable no-use-before-define */
import type { LatestTopic } from '@agoric/notifier';
import type { ERef } from '@endo/far';
import type { RemotableObject } from '@endo/pass-style';
import type { CopySet, Key, Pattern } from '@endo/patterns';
import type { AssetKind } from '@agoric/ertp';

export type MinOrchAccountAddress = {};

export type MinOrchAccount = {
  getFullBalance(): ERef<Amount>;
  transfer(dest: MinOrchAccountAddress, depositAmount: Amount): ERef<void>;
  getAddress(): MinOrchAccountAddress;
};

export type MinOrchChain = {
  makeAccount(brand: Brand): ERef<MinOrchAccount>;
};

// ////////////////////////////////////////////////////////////////////////////

export type OrchDepositFacetReceive = (
  payment: Payment,
  optAmountShape?: Pattern,
) => ERef<Amount>;

export type OrchDepositFacet = {
  /**
   * Deposit all the contents of payment
   * into the purse that made this facet, returning the amount. If the optional
   * argument `optAmount` does not equal the amount of digital assets in the
   * payment, throw an error.
   *
   * If payment is a promise, throw an error.
   */
  receive: OrchDepositFacetReceive;
};

/**
 * Purses hold amount of
 *   digital assets of the same brand, but unlike Payments, they are not meant
 *   to be sent to others. To transfer digital assets, a Payment should be
 *   withdrawn from a Purse. The amount of digital assets in a purse can change
 *   through the action of deposit() and withdraw().
 */
export type OrchPurse<
  K extends AssetKind = AssetKind,
  M extends Key = Key,
> = RemotableObject & OrchPurseMethods<K, M>;

/**
 * The primary use for Purses and Payments is for
 *   currency-like and goods-like digital assets, but they can also be used to
 *   represent other kinds of rights, such as the right to participate in a
 *   particular contract.
 */
export type OrchPurseMethods<
  K extends AssetKind = AssetKind,
  M extends Key = Key,
> = {
  /**
   * Get the alleged Brand for this
   * Purse
   */
  getAllegedBrand: () => Brand<K>;

  /**
   * Get the amount contained in
   * this purse.
   */
  getCurrentAmount: () => ERef<Amount<K, M>>;

  /**
   * Get the amount contained in
   * this purse + all payments still in the recoverySet at this moment
   */
  getCurrentFullBalance: () => ERef<Amount<K, M>>;

  /**
   * Get a
   * lossy notifier for changes to this purse's balance.
   */
  getCurrentAmountNotifier: () => LatestTopic<Amount<K, M>>;

  /**
   *   Deposit all the contents of payment into this purse, returning the amount. If
   *   the optional argument `optAmount` does not equal the amount of digital
   *   assets in the payment, throw an error.
   *
   *   If payment is a promise, throw an error.
   */
  deposit: <P extends Payment<K, M>>(
    payment: P,
    optAmountShape?: Pattern,
  ) => ERef<Amount<K, M>>;

  /**
   * Return an object whose
   * `receive` method deposits to the current Purse.
   */
  getDepositFacet: () => OrchDepositFacet;

  /**
   * Withdraw amount
   * from this purse into a new Payment.
   */
  withdraw: (amount: Amount<K, M>) => Payment<K, M>;

  /**
   * The set of payments
   * withdrawn from this purse that are still live. These are the payments that
   * can still be recovered in emergencies by, for example, depositing into this
   * purse. Such a deposit action is like canceling an outstanding check because
   * you're tired of waiting for it. Once your cancellation is acknowledged, you
   * can spend the assets at stake on other things. Afterwards, if the recipient
   * of the original check finally gets around to depositing it, their deposit
   * fails.
   *
   * Returns an empty set if this issuer does not support recovery sets.
   */
  getRecoverySet: () => CopySet<Payment<K, M>>;

  /**
   * For use in emergencies, such as
   * coming back from a traumatic crash and upgrade. This deposits all the
   * payments in this purse's recovery set into the purse itself, returning the
   * total amount of assets recovered.
   *
   * Returns an empty amount if this issuer does not support recovery sets.
   */
  recoverAll: () => Amount<K, M>;
};
