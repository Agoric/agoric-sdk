import { mustMatch } from '@agoric/store';
import { E } from '@endo/far';
import { AmountMath } from './amountMath.js';

const { Fail } = assert;

// This file contains safer helper function alternatives to the
// similarly named methods on issuer.
// These are parameterized by a purse. Any payments created by these
// helper functions are in the recovery set of that purse until otherwise
// used up.
//
// One of these helper functions is less safe in one way:
// `combine` is not failure atomic. If the `combine` helper function
// fails, some of the input payments may have been used up. However, even
// in that case, no assets would be lost. The assets from the used up payments
// will be in the argument purse.

/**
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} purse
 * @param {ERef<Payment<K>>} srcPaymentP
 * @param {Pattern} [optAmountShape]
 * @returns {Promise<Payment<K>>}
 */
export const claim = async (purse, srcPaymentP, optAmountShape = undefined) => {
  const srcPayment = await srcPaymentP;
  return E.when(E(purse).deposit(srcPayment, optAmountShape), amount =>
    E(purse).withdraw(amount),
  );
};
harden(claim);

/**
 * Note: Not failure atomic. If any of the deposits fail, or the total does not
 * match optTotalAmount, some payments may still have been deposited.
 *
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} purse
 * @param {ERef<Payment<K>>[]} srcPaymentsPs
 * @param {Pattern} [optTotalAmount]
 * @returns {Promise<Payment<K>>}
 */
export const combine = async (
  purse,
  srcPaymentsPs,
  optTotalAmount = undefined,
) => {
  const [brand, displayInfo, ...srcPayments] = await Promise.all([
    E(purse).getAllegedBrand(),
    E(E(purse).getAllegedBrand()).getDisplayInfo(),
    ...srcPaymentsPs,
  ]);
  const emptyAmount = AmountMath.makeEmpty(brand, displayInfo.assetKind);
  const amountPs = srcPayments.map(srcPayment => E(purse).deposit(srcPayment));
  const amounts = await Promise.all(amountPs);
  const total = amounts.reduce(
    (x, y) => AmountMath.add(x, y, brand),
    emptyAmount,
  );
  if (optTotalAmount !== undefined) {
    mustMatch(total, optTotalAmount, 'amount');
  }
  return E(purse).withdraw(total);
};
harden(combine);

/**
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} purse
 * @param {ERef<Payment<K>>} srcPaymentP
 * @param {Amount<K>} paymentAmountA
 * @returns {Promise<Payment<K>[]>}
 */
export const split = async (purse, srcPaymentP, paymentAmountA) => {
  const srcPayment = await srcPaymentP;
  const srcAmount = await E(purse).deposit(srcPayment);
  const paymentAmountB = AmountMath.subtract(srcAmount, paymentAmountA);
  return Promise.all([
    E(purse).withdraw(paymentAmountA),
    E(purse).withdraw(paymentAmountB),
  ]);
};
harden(split);

/**
 * @template {AssetKind} K
 * @param {ERef<Purse<K>>} purse
 * @param {ERef<Payment<K>>} srcPaymentP
 * @param {Amount<K>[]} amounts
 * @returns {Promise<Payment[]>}
 */
export const splitMany = async (purse, srcPaymentP, amounts) => {
  const srcPayment = await srcPaymentP;
  const srcAmount = await E(purse).deposit(srcPayment);
  const brand = srcAmount.brand;
  const emptyAmount = AmountMath.makeEmptyFromAmount(srcAmount);
  const total = amounts.reduce(
    (x, y) => AmountMath.add(x, y, brand),
    emptyAmount,
  );
  AmountMath.isEqual(srcAmount, total) ||
    Fail`rights were not conserved: ${total} vs ${srcAmount}`;

  return Promise.all(amounts.map(amount => E(purse).withdraw(amount)));
};
harden(splitMany);
