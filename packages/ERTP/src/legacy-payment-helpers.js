// @jessie-check

import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { mustMatch } from '@agoric/store';
import { AmountMath } from './amountMath.js';

/**
 * @import {ERef} from '@endo/far';
 * @import {Key} from '@endo/patterns';
 * @import {Amount, AssetKind, Payment, Purse} from './types.js';
 */

/**
 * @file This file contains safer helper function alternatives to the similarly
 *   named methods on issuer. These are parameterized by a purse used for
 *   recovering lost payments, which we call a `recoveryPurse`. Any payments
 *   created by these helper functions are in the recovery set of that
 *   `recoveryPurse` until otherwise used up.
 *
 *   One of these helper functions is less safe in one way: `combine` is not
 *   failure atomic. If the `combine` helper function fails, some of the input
 *   payments may have been used up. However, even in that case, no assets would
 *   be lost. The assets from the used up payments will be in the argument
 *   `recoveryPurse`.
 */

/**
 * @template {AssetKind} K
 * @template {Key} T type of values in set-like kind
 * @param {ERef<Purse<K, T>>} recoveryPurse
 * @param {ERef<Payment<K, T>>} srcPaymentP
 * @param {Pattern} [optAmountShape]
 * @returns {Promise<Payment<K, T>>}
 */
export const claim = async (
  recoveryPurse,
  srcPaymentP,
  optAmountShape = undefined,
) => {
  const srcPayment = await srcPaymentP;
  return E.when(E(recoveryPurse).deposit(srcPayment, optAmountShape), amount =>
    E(recoveryPurse).withdraw(amount),
  );
};
harden(claim);

/**
 * Note: Not failure atomic. But as long as you don't lose the argument
 * `recoveryPurse`, no assets are lost. If any of the deposits fail, or the
 * total does not match optTotalAmount, some payments may still have been
 * deposited. Those assets will be in the argument `recoveryPurse`. All
 * undeposited payments will still be in the recovery sets of their purses of
 * origin.
 *
 * @template {AssetKind} K
 * @template {Key} T type of values in set-like kind
 * @param {ERef<Purse<K, T>>} recoveryPurse
 * @param {ERef<Payment<K, T>>[]} srcPaymentsPs
 * @param {Pattern} [optTotalAmount]
 * @returns {Promise<Payment<K, T>>}
 */
export const combine = async (
  recoveryPurse,
  srcPaymentsPs,
  optTotalAmount = undefined,
) => {
  const brandP = E(recoveryPurse).getAllegedBrand();
  const [brand, displayInfo, ...srcPayments] = await Promise.all([
    brandP,
    E(brandP).getDisplayInfo(),
    ...srcPaymentsPs,
  ]);

  // XXX Brand lacks M
  const emptyAmount = /** @type {Amount<K, T>} */ (
    AmountMath.makeEmpty(brand, displayInfo.assetKind)
  );
  const amountPs = srcPayments.map(srcPayment =>
    E(recoveryPurse).deposit(srcPayment),
  );
  const amounts = await Promise.all(amountPs);
  const total = amounts.reduce(
    (x, y) => AmountMath.add(x, y, brand),
    emptyAmount,
  );
  if (optTotalAmount !== undefined) {
    mustMatch(total, optTotalAmount, 'amount');
  }
  return E(recoveryPurse).withdraw(total);
};
harden(combine);

/**
 * Note: Not failure atomic. But as long as you don't lose the argument
 * `recoveryPurse`, no assets are lost. If the amount in `srcPaymentP` is not >=
 * `paymentAmountA`, the payment may still be deposited anyway, before failing
 * in the subsequent subtract. In that case, those assets will be in the
 * argument `recoveryPurse`.
 *
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} recoveryPurse
 * @param {ERef<Payment<K>>} srcPaymentP
 * @param {Amount<K>} paymentAmountA
 * @returns {Promise<Payment<K>[]>}
 */
export const split = async (recoveryPurse, srcPaymentP, paymentAmountA) => {
  const srcPayment = await srcPaymentP;
  // See https://github.com/Agoric/agoric-sdk/issues/7193 which explains
  // how we would like to write the following line, and why we cannot yet do so.
  const srcAmount = await E(recoveryPurse).deposit(srcPayment);
  const paymentAmountB = AmountMath.subtract(srcAmount, paymentAmountA);
  return Promise.all([
    E(recoveryPurse).withdraw(paymentAmountA),
    E(recoveryPurse).withdraw(paymentAmountB),
  ]);
};
harden(split);

/**
 * Note: Not failure atomic. But as long as you don't lose the argument
 * `recoveryPurse`, no assets are lost. If the amount in `srcPaymentP` is
 * exactly the sum of the amounts, the payment may still be deposited anyway,
 * before failing in the subsequent equality check. In that case, those assets
 * will be in the argument `recoveryPurse`.
 *
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} recoveryPurse
 * @param {ERef<Payment<K>>} srcPaymentP
 * @param {Amount<K>[]} amounts
 * @returns {Promise<Payment[]>}
 */
export const splitMany = async (recoveryPurse, srcPaymentP, amounts) => {
  const srcPayment = await srcPaymentP;
  // If we could calculate `total` before the `deposit`, then we
  // could use the `total` as the second argument to `deposit` and be
  // failure atomic. But this would require making an empty amount first,
  // which is possible, but too much trouble for a deprecated legacy support
  // method.
  const srcAmount = await E(recoveryPurse).deposit(srcPayment);
  const brand = srcAmount.brand;
  const emptyAmount = AmountMath.makeEmptyFromAmount(srcAmount);
  const total = amounts.reduce(
    (x, y) => AmountMath.add(x, y, brand),
    emptyAmount,
  );
  AmountMath.isEqual(srcAmount, total) ||
    Fail`rights were not conserved: ${total} vs ${srcAmount}`;

  return Promise.all(amounts.map(amount => E(recoveryPurse).withdraw(amount)));
};
harden(splitMany);
