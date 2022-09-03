// @ts-check

import { deeplyFulfilledObject, objectMap } from '@agoric/internal';
import { E } from '@endo/far';

/**
 *
 * @param {AmountKeywordRecord} amountKeywordRecord
 * @param {(brand: Brand) => ERef<Purse>} purseForBrand
 * @returns {PaymentPKeywordRecord}
 */
export const withdrawPaymentsFromPurses = (
  amountKeywordRecord,
  purseForBrand,
) => {
  return objectMap(amountKeywordRecord, amount =>
    E(purseForBrand(amount.brand)).withdraw(amount),
  );
};
harden(withdrawPaymentsFromPurses);

/**
 *
 * @param {PaymentPKeywordRecord} paymentPKeywordRecord
 * @param {(brand: Brand) => ERef<Purse>} purseForBrand
 * @returns {Promise<AmountKeywordRecord>}
 */
export const depositPaymentsIntoPurses = async (
  paymentPKeywordRecord,
  purseForBrand,
) => {
  /** @type {PaymentKeywordRecord} */
  // @ts-expect-error ???
  const paymentKeywordRecord = await deeplyFulfilledObject(
    paymentPKeywordRecord,
  );
  /** Record<string, Promise<Amount>> */
  const amountPKeywordRecord = objectMap(paymentKeywordRecord, payment =>
    E(purseForBrand(payment.getAllegedBrand())).deposit(payment),
  );
  return deeplyFulfilledObject(amountPKeywordRecord);
};
harden(depositPaymentsIntoPurses);
