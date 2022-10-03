// @ts-check

import { makePromiseKit } from '@endo/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { handlePKitWarning } from '../handleWarning.js';
import { satisfiesWant } from '../contractFacet/offerSafety.js';

import '../types.js';
import '../internal-types.js';

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
  exitZoeSeatAdmin,
  hasExited,
  proposal,
  withdrawPayments,
  exitObj,
  offerResult,
) => {
  const payoutPromiseKit = makePromiseKit();
  handlePKitWarning(payoutPromiseKit);
  const { notifier, updater } = makeNotifierKit();

  // Prime the notifier with the initial allocation.
  updater.updateState(initialAllocation);

  let currentAllocation = initialAllocation;

  const doExit = zoeSeatAdmin => {
    exitZoeSeatAdmin(zoeSeatAdmin);

    /** @type {PaymentPKeywordRecord} */
    const payout = withdrawPayments(currentAllocation);
    payoutPromiseKit.resolve(payout);
  };

  /** @type {ZoeSeatAdmin} */
  const zoeSeatAdmin = Far('zoeSeatAdmin', {
    replaceAllocation: replacementAllocation => {
      assert(
        !hasExited(zoeSeatAdmin),
        'Cannot replace allocation. Seat has already exited',
      );
      harden(replacementAllocation);
      // Merging happens in ZCF, so replacementAllocation can
      // replace the old allocation entirely.
      updater.updateState(replacementAllocation);
      currentAllocation = replacementAllocation;
    },
    exit: reason => {
      assert(
        !hasExited(zoeSeatAdmin),
        'Cannot exit seat. Seat has already exited',
      );
      updater.finish(reason);
      doExit(zoeSeatAdmin);
    },
    fail: reason => {
      assert(
        !hasExited(zoeSeatAdmin),
        'Cannot fail seat. Seat has already exited',
      );
      updater.fail(reason);
      doExit(zoeSeatAdmin);
    },
    getNotifier: () => Promise.resolve(notifier),
  });

  /** @type {UserSeat} */
  const userSeat = Far('userSeat', {
    getProposal: async () => proposal,
    getPayouts: async () => payoutPromiseKit.promise,
    getPayout: async keyword => {
      assert(keyword, 'A keyword must be provided');
      return E.get(payoutPromiseKit.promise)[keyword];
    },
    getOfferResult: async () => offerResult,
    hasExited: async () => hasExited(zoeSeatAdmin),
    tryExit: async () => E(exitObj).exit(),

    getCurrentAllocationJig: async () => currentAllocation,
    getAllocationNotifierJig: async () => notifier,
    getFinalAllocation: () =>
      E.when(payoutPromiseKit.promise, () => currentAllocation),

    numWantsSatisfied: async () => {
      return E.when(payoutPromiseKit.promise, () =>
        satisfiesWant(proposal, currentAllocation),
      );
    },
  });

  return { userSeat, zoeSeatAdmin, notifier };
};
