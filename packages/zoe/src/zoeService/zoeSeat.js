import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit, updateFromNotifier } from '@agoric/notifier';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { objectMap } from '../objArrayConversion';

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

  let howExited = 'internal error: not exited yet';

  const atomicallyClosePosition = (exitedKind = 'exited') => {
    assert(
      // eslint-disable-next-line no-use-before-define
      instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
      `Seat cannot be ${howExited}. Seat has already ${exitedKind}`,
    );
    // At this point, we know that the local position has not yet been closed.
    // We know that payoutPromiseKit.resolve is not yet used up.
    //
    // We leave the remaining local zoeSeatAdmin state
    //    * payoutPromiseKit.resolve
    //    * offerResultPromiseKit.resolve
    //    * updater
    //    * exitObjPromiseKit.resolve
    //    * innerUserSeatP
    // to our caller since different callers will want to do different things.
    //
    // Removes this zoeSeatAdmin, since it is the interlock we check
    // above. Thus we ensure that we will proceed past that test at most once.
    // eslint-disable-next-line no-use-before-define
    instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);
    howExited = exitedKind;
  };

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
      // will throw if already closed.
      atomicallyClosePosition('exited');

      const payout = objectMap(currentAllocation, ([keyword, payoutAmount]) => {
        const purse = brandToPurse.get(payoutAmount.brand);
        return [keyword, E(purse).withdraw(payoutAmount)];
      });
      harden(payout);

      payoutPromiseKit.resolve(payout);
      // ignore offerResultPromiseKit.resolve
      updater.finish(undefined);
      // ignore exitObjPromiseKit.resolve (TODO really?)
      // ignore innerUserSeatP
    },
    getCurrentAllocation: () => currentAllocation,
    getProposal: async () => proposal,

    redirectUserSeat: targetUserSeat => {
      // will throw if already closed.
      atomicallyClosePosition('forwarded');

      payoutPromiseKit.resolve(E(targetUserSeat).getPayouts());

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
      offerResultPromiseKit.resolve(E(targetUserSeat).getOfferResult());

      updateFromNotifier(updater, E(targetUserSeat).getNotifier());

      // TODO what about exit?

      // eslint-disable-next-line no-use-before-define
      innerUserSeatP = targetUserSeat;
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
    getNotifier: async () => notifier,
    exit: async () => E(exitObjPromiseKit.promise).exit(),
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
    // If the notifier were a lossless stream of updates, blithely forwarding
    // it here would be dangerous. Updates could get lost. But for a notifier,
    // that's what we want.
    getNotifier: async () => E(innerUserSeatP).getNotifier(),
    exit: E(innerUserSeatP).exit(),
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
