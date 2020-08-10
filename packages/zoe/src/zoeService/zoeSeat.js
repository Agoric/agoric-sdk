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
  const payoutPromiseKit = makePromiseKit();
  const offerResultPromiseKit = promises.offerResult || makePromiseKit();
  const exitObjPromiseKit = promises.exitObj || makePromiseKit();
  const { notifier, updater } = makeNotifierKit();

  let currentAllocation = initialAllocation;

  /** @type ZoeSeatAdmin */
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

    redirectUserSeat: newInnerUserSeatP => {
      assert(
        instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
        `Cannot redirect seat. Seat has already exited`,
      );
      instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);
      payoutPromiseKit.resolve(E(newInnerUserSeatP).getPayouts());
      // For a normal user seat, created from an invitation, this
      // `resolve` will likely have no effect since that promise is
      // already resolved, and the caller has likely already picked it
      // up. However, if this seat is made internally (by `makeEmptyOffer`
      // or omitting the seat argument from `mintGains`), then the
      // offerResult according to the new userSeat will be the first one
      // for this seat.
      //
      // In addition, if the user asks after the seat is forwarded, they'll
      // get the new offerResult because of the forwarding behavior.
      offerResultPromiseKit.resolve(E(newInnerUserSeatP).getOfferResult());
      // TODO exit handling will be tricky!
      // eslint-disable-next-line no-use-before-define
      innerUserSeatP = newInnerUserSeatP;
    },
  });

  /** @type ERef<UserSeat> */
  let innerUserSeatP = harden({
    getCurrentAllocation: async () => currentAllocation,
    getProposal: async () => proposal,
    getPayouts: async () => payoutPromiseKit.promise,
    getPayout: async keyword =>
      payoutPromiseKit.promise.then(payouts => payouts[keyword]),
    getOfferResult: async () => offerResultPromiseKit.promise,
    exit: async () =>
      exitObjPromiseKit.promise.then(exitObj => E(exitObj).exit()),
  });

  /** @type UserSeat */
  const userSeat = harden({
    getCurrentAllocation: async () => E(innerUserSeatP).getCurrentAllocation(),
    // proposal is stable
    getProposal: async () => proposal,
    // could return the same one, but prefer shorter path
    getPayouts: async () => E(innerUserSeatP).getPayouts(),
    getPayout: async keyword => E(innerUserSeatP).getPayout(keyword),
    // This will be the offer result according to the current innerUserSeatP
    // even if an offerResult has already been reported.
    getOfferResult: async () => E(innerUserSeatP).getOfferResult(),
    exit: E(innerUserSeatP).exit(),
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
