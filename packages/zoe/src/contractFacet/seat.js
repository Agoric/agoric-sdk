// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';

import { isOfferSafe } from './offerSafety';

import '../../exported';
import '../internal-types';

/** @type MakeSeatAdmin */
export const makeSeatAdmin = (
  allSeatStagings,
  zoeSeat,
  seatData,
  getAmountMath,
) => {
  // The proposal and notifier are not reassigned.
  const { proposal, notifier } = seatData;

  // The currentAllocation, exited, and stagedAllocation may be reassigned.
  let currentAllocation = harden(seatData.initialAllocation);
  let exited = false; // seat is "active"

  /** @type ZCFSeatAdmin */
  const seatAdmin = harden({
    commit: seatStaging => {
      assert(
        allSeatStagings.has(seatStaging),
        details`The seatStaging ${seatStaging} was not recognized`,
      );
      currentAllocation = seatStaging.getStagedAllocation();
      E(zoeSeat).replaceAllocation(currentAllocation);
    },
  });

  /** @type {ZCFSeat} */
  const seat = harden({
    exit: () => {
      exited = true;
      E(zoeSeat).exit();
    },
    kickOut: (msg = 'Kicked out of seat') => {
      seat.exit();
      assert.fail(msg);
    },
    getNotifier: () => notifier,
    hasExited: () => exited,
    getProposal: () => proposal,
    getAmountAllocated: (keyword, brand) => {
      if (currentAllocation[keyword] !== undefined) {
        return currentAllocation[keyword];
      }
      return getAmountMath(brand).getEmpty();
    },
    getCurrentAllocation: () => currentAllocation,
    isOfferSafe: newAllocation => {
      const reallocation = harden({
        ...currentAllocation,
        ...newAllocation,
      });

      return isOfferSafe(getAmountMath, proposal, reallocation);
    },
    stage: newAllocation => {
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
        getSeat: () => seat,
        getStagedAllocation: () => allocation,
      };
      allSeatStagings.add(seatStaging);
      return seatStaging;
    },
  });

  return harden({ seat, seatAdmin });
};
