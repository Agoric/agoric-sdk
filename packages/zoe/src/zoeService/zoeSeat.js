// @ts-check

import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import '../types';
import '../internal-types';
/**
 * makeZoeSeatAdminKit makes an object that manages the state of a seat
 * participating in a Zoe contract and return its two facets.
 *
 * The UserSeat
 * is suitable to be handed to an agent outside zoe and the contract and allows
 * them to query or monitor the current state, access the payouts and result,
 * and call exit() if that's allowed for this seat.
 *
 * The zoeSeatAdmin is passed by Zoe to the ContractFacet (zcf), to allow zcf to
 * query or update the allocation or exit the seat cleanly.
 */

/** @type {MakeZoeSeatAdminKit} */
export const makeZoeSeatAdminKit = (
  initialAllocation,
  instanceAdmin,
  proposal,
  brandToPurse,
  promises = {},
) => {
  const payoutPromiseKit = makePromiseKit();
  const offerResultPromiseKit = promises.offerResult || makePromiseKit();
  const exitObjP = promises.exitObj ? promises.exitObj.promise :
      // Offerless seat case
      harden({
        exit: () => {
          throw new Error(`Offerless seats may not be exited`);
        },
      });
  const { notifier, updater } = makeNotifierKit();

  let currentAllocation = initialAllocation;

  /** @type {ZoeSeatAdmin} */
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

  /** @type {UserSeat} */
  const userSeat = harden({
    getCurrentAllocation: async () => zoeSeatAdmin.getCurrentAllocation(),
    getProposal: async () => proposal,
    getPayouts: async () => payoutPromiseKit.promise,
    getPayout: async keyword =>
      payoutPromiseKit.promise.then(payouts => payouts[keyword]),
    getOfferResult: async () => offerResultPromiseKit.promise,
    hasExited: async () => instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
    tryExit: async () => E(exitObjPromiseKitPromise).exit(),
    getNotifier: async () => notifier,
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
