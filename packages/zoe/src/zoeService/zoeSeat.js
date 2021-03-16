// @ts-check

import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { objectMap } from '../objArrayConversion';

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
  exitObj,
  offerResult,
) => {
  const payoutPromiseKit = makePromiseKit();
  // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
  // This does not suppress any error messages.
  payoutPromiseKit.promise.catch(_ => {});
  const { notifier, updater } = makeNotifierKit();

  let currentAllocation = initialAllocation;

  const doExit = zoeSeatAdmin => {
    instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);

    /** @type {PaymentPKeywordRecord} */
    const payout = objectMap(currentAllocation, ([keyword, payoutAmount]) => {
      const purse = brandToPurse.get(payoutAmount.brand);
      // TODO: fix types of ObjectMap
      // @ts-ignore
      return [keyword, E(purse).withdraw(payoutAmount)];
    });
    harden(payout);
    payoutPromiseKit.resolve(payout);
  };

  /** @type {ZoeSeatAdmin} */
  const zoeSeatAdmin = Far('zoeSeatAdmin', {
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
    exit: reason => {
      assert(
        instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
        `Cannot exit seat. Seat has already exited`,
      );
      updater.finish(reason);
      doExit(zoeSeatAdmin);
    },
    fail: reason => {
      assert(
        instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
        `Cannot fail seat. Seat has already exited`,
      );
      updater.fail(reason);
      doExit(zoeSeatAdmin);
    },
    getCurrentAllocation: () => currentAllocation,
  });

  /** @type {UserSeat} */
  const userSeat = Far('userSeat', {
    getCurrentAllocation: async () => zoeSeatAdmin.getCurrentAllocation(),
    getProposal: async () => proposal,
    getPayouts: async () => payoutPromiseKit.promise,
    getPayout: async keyword => {
      assert(keyword, 'A keyword must be provided');
      return E.get(payoutPromiseKit.promise)[keyword];
    },
    getOfferResult: async () => offerResult,
    hasExited: async () => !instanceAdmin.hasZoeSeatAdmin(zoeSeatAdmin),
    tryExit: async () => E(exitObj).exit(),
    getNotifier: async () => notifier,
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
