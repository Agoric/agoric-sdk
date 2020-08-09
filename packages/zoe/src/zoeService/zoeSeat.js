import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

export const makeZoeSeatAdminKit = (
  initialAllocation,
  instanceAdmin,
  proposal,
  brandToPurse,
  promises = {},
) => {
  const payoutPromiseKit = promises.payout || makePromiseKit();
  const offerResultPromiseKit = promises.offerResult || makePromiseKit();
  const exitObjPromiseKit = promises.exitObj || makePromiseKit();
  const { notifier, updater } = makeNotifierKit();

  let currentAllocation = initialAllocation;
  const zoeSeatAdmin = harden({
    replaceAllocation: replacementAllocation => {
      assert(
        instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
        `Cannot replace allocation. Seat has already exited`,
      );
      harden(replacementAllocation);
      // Merging happens in ZCF, so replacementAllocation can
      // replace the old allocation entirely.
      updater.updateState(replacementAllocation);
      currentAllocation = replacementAllocation;
    },
    exit: () => {
      assert(
        instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
        `Cannot exit seat. Seat has already exited`,
      );
      updater.finish(undefined);
      instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);

      /** @type {PaymentPKeywordRecord} */
      const payout = {};
      Object.entries(currentAllocation).forEach(([keyword, payoutAmount]) => {
        const purse = brandToPurse.get(payoutAmount.brand);
        payout[keyword] = E(purse).withdraw(payoutAmount);
      });
      harden(payout);
      payoutPromiseKit.resolve(payout);
    },
    getCurrentAllocation: () => currentAllocation,
  });

  const userSeat = harden({
    getCurrentAllocation: async () => zoeSeatAdmin.getCurrentAllocation(),
    getProposal: async () => proposal,
    getPayouts: async () => payoutPromiseKit.promise,
    getPayout: async keyword =>
      payoutPromiseKit.promise.then(payouts => payouts[keyword]),
    getOfferResult: async () => offerResultPromiseKit.promise,
    exit: async () =>
      exitObjPromiseKit.promise.then(exitObj => E(exitObj).exit()),
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
