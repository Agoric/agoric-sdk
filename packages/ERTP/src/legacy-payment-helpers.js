import { mustMatch } from '@agoric/store';
import { E } from '@endo/far';
import { AmountMath } from './amountMath.js';

const { Fail } = assert;

// This file contains safer alternatives to the similarly named helpers on
// issuer. These are parameterized by a purse. Any payments created by these
// helper functions are in the recovery set of that purse until otherwise
// used up.
//
// One helper is less safe in one way: `combine` is not failure atomic. If
// it fails, some of the input payments may have been used up. However, even
// in that case, no assets should be lost. The assets from the used up payments
// will be in the argument purse.

/**
 * @param {ERef<Purse>} purse
 * @param {ERef<Payment>} srcPaymentP
 * @param {Pattern} [optAmountShape]
 */
export const claim = async (purse, srcPaymentP, optAmountShape = undefined) => {
  const srcPayment = await srcPaymentP;
  const amount = await E(purse).deposit(srcPayment, optAmountShape);
  return E(purse).withdraw(amount);
};
harden(claim);

/**
 * Note: Not failure atomic. If any of the deposits fail, or the total does not
 * match optTotalAmount, some payments may still have been deposited.
 *
 * @param {ERef<Purse>} purse
 * @param {ERef<Payment>[]} srcPaymentsPs
 * @param {Pattern} [optTotalAmount]
 */
export const combine = async (
  purse,
  srcPaymentsPs,
  optTotalAmount = undefined,
) => {
  const [brand, ...srcPayments] = await Promise.all([
    E(purse).getAllegedBrand(),
    ...srcPaymentsPs,
  ]);
  const emptyAmount = AmountMath.makeEmpty(
    brand,
    brand.getDisplayInfo().assetKind,
  );
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
 * @param {ERef<Purse>} purse
 * @param {ERef<Payment>} srcPaymentP
 * @param {Amount} paymentAmountA
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
 * @param {ERef<Purse>} purse
 * @param {ERef<Payment>} srcPaymentP
 * @param {Amount[]} amounts
 */
export const splitMany = async (purse, srcPaymentP, amounts) => {
  const srcPayment = await srcPaymentP;
  const srcAmount = await E(purse).deposit(srcPayment);
  const brand = srcAmount.brand;
  const emptyAmount = AmountMath.makeEmpty(
    brand,
    brand.getDisplayInfo().assetKind,
  );
  const total = amounts.reduce(
    (x, y) => AmountMath.add(x, y, brand),
    emptyAmount,
  );
  AmountMath.isEqual(srcAmount, total) ||
    Fail`rights were not conserved: ${total} vs ${srcAmount}`;

  return Promise.all(amounts.map(amount => E(purse).withdraw(amount)));
};
harden(splitMany);
