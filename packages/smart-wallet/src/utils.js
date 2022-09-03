// @ts-check

import { deeplyFulfilledObject, objectMap } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
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

/**
 * Coalesce updates from a wallet UpdateRecord publication feed. Note that local
 * state may not reflect the wallet's state if the initial updates are missed.
 *
 * If this proves to be a problem we can add an option to this or a related
 * utility to reset state from RPC.
 *
 * @param {ERef<StoredSubscriber<import('./smartWallet').UpdateRecord>>} updates
 */
export const coalesceUpdates = updates => {
  /** @type {Map<Brand, import('./smartWallet').BrandDescriptor>} */
  const brands = new Map();
  /** @type {{ [id: number]: import('./offers').OfferStatus}} */
  const offerStatuses = {};
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();
  observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      // XXX use discriminated union
      if ('latestBalance' in updateRecord) {
        const { currentAmount } = updateRecord.latestBalance;
        balances.set(currentAmount.brand, currentAmount);
      } else if ('latestOfferStatus' in updateRecord) {
        const status = updateRecord.latestOfferStatus;
        offerStatuses[status.id] = status;
      } else if ('latestBrand' in updateRecord) {
        const descriptor = updateRecord.latestBrand;
        brands.set(descriptor.brand, descriptor);
      }
    },
  });
  return { brands, offerStatuses, balances };
};
