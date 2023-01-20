import { deeplyFulfilledObject, objectMap } from '@agoric/internal';
import { E } from '@endo/far';

/**
 * Used in an offer execution to manage payments state safely.
 *
 * @param {(brand: Brand) => Promise<import('./types').RemotePurse>} purseForBrand
 * @param {{ receive: (payment: *) => Promise<Amount> }} depositFacet
 */
export const makePaymentsHelper = (purseForBrand, depositFacet) => {
  /** @type {PaymentPKeywordRecord | null} */
  let keywordPaymentPromises = null;

  /**
   * Tracks from whence our payment came.
   *
   * @type {Map<Payment, import('./types').RemotePurse>}
   */
  const paymentToPurse = new Map();

  return {
    /**
     * @param {AmountKeywordRecord} give
     * @returns {PaymentPKeywordRecord}
     */
    withdrawGive(give) {
      assert(
        !keywordPaymentPromises,
        'withdrawPayments can be called once per helper',
      );
      keywordPaymentPromises = objectMap(give, amount => {
        /** @type {Promise<import('./types').RemotePurse<any>>} */
        const purseP = purseForBrand(amount.brand);
        return Promise.all([purseP, E(purseP).withdraw(amount)]).then(
          ([purse, payment]) => {
            paymentToPurse.set(payment, purse);
            return payment;
          },
        );
      });
      return keywordPaymentPromises;
    },

    /**
     * Try reclaiming any of our payments that we successfully withdrew, but
     * were left unclaimed.
     */
    tryReclaimingWithdrawnPayments() {
      if (!keywordPaymentPromises) return Promise.resolve(undefined);
      const paymentPromises = Object.values(keywordPaymentPromises);
      // Use allSettled to ensure we attempt all the deposits, regardless of
      // individual rejections.
      return Promise.allSettled(
        paymentPromises.map(async paymentP => {
          // Wait for the withdrawal to complete.  This protects against a race
          // when updating paymentToPurse.
          const payment = await paymentP;

          // Find out where it came from.
          const purse = paymentToPurse.get(payment);
          if (purse === undefined) {
            // We already tried to reclaim this payment, so stop here.
            return undefined;
          }

          // Now send it back to the purse.
          try {
            return E(purse).deposit(payment);
          } finally {
            // Once we've called addPayment, mark this one as done.
            paymentToPurse.delete(payment);
          }
        }),
      );
    },

    /**
     * @param {PaymentPKeywordRecord} payouts
     * @returns {Promise<AmountKeywordRecord>} amounts for deferred deposits will be empty
     */
    async depositPayouts(payouts) {
      /** Record<string, Promise<Amount>> */
      const amountPKeywordRecord = objectMap(payouts, paymentRef =>
        E.when(paymentRef, payment => depositFacet.receive(payment)),
      );
      return deeplyFulfilledObject(amountPKeywordRecord);
    },
  };
};
harden(makePaymentsHelper);
