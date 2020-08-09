// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';

import { isOfferSafe } from './offerSafety';

import '../../exported';
import '../internal-types';

/** @type MakeZcfSeatAdminKit */
export const makeZcfSeatAdminKit = (
  allSeatStagings,
  zoeSeatAdmin,
  seatData,
  getAmountMath,
) => {
  // The proposal and notifier are not reassigned.
  const { proposal, notifier } = seatData;

  // The currentAllocation, exited, and stagedAllocation may be reassigned.
  let currentAllocation = harden(seatData.initialAllocation);
  let exited = false; // seat is "active"

  /** @type ZCFSeatAdmin */
  const zcfSeatAdmin = harden({
    commit: seatStaging => {
      assert(
        allSeatStagings.has(seatStaging),
        details`The seatStaging ${seatStaging} was not recognized`,
      );
      currentAllocation = seatStaging.getStagedAllocation();
      E(zoeSeatAdmin).replaceAllocation(currentAllocation);
    },
  });

  const assertExitedFalse = () => assert(!exited, `seat has been exited`);

  /** @type {ZCFSeat} */
  const zcfSeat = harden({
    exit: () => {
      assertExitedFalse();
      exited = true;
      E(zoeSeatAdmin).exit();
    },
    kickOut: (msg = 'Kicked out of seat') => {
      assertExitedFalse();
      zcfSeat.exit();
      assert.fail(msg);
    },
    getNotifier: () => {
      assertExitedFalse();
      return notifier;
    },
    hasExited: () => exited,
    getProposal: () => {
      assertExitedFalse();
      return proposal;
    },
    getAmountAllocated: (keyword, brand) => {
      assertExitedFalse();
      if (currentAllocation[keyword] !== undefined) {
        return currentAllocation[keyword];
      }
      return getAmountMath(brand).getEmpty();
    },
    getCurrentAllocation: () => {
      assertExitedFalse();
      return currentAllocation;
    },
    isOfferSafe: newAllocation => {
      assertExitedFalse();
      const reallocation = harden({
        ...currentAllocation,
        ...newAllocation,
      });

      return isOfferSafe(getAmountMath, proposal, reallocation);
    },
    stage: newAllocation => {
      assertExitedFalse();
      // Check offer safety.
      const allocation = harden({
        ...currentAllocation,
        ...newAllocation,
      });

      assert(
        isOfferSafe(getAmountMath, proposal, allocation),
        details`The reallocation was not offer safe`,
      );

      const seatStaging = {
        getSeat: () => zcfSeat,
        getStagedAllocation: () => allocation,
      };
      allSeatStagings.add(seatStaging);
      return seatStaging;
    },
  });

  return harden({ zcfSeat, zcfSeatAdmin });
};
