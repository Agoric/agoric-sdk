// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { amountMath } from '@agoric/ertp';

import { isOfferSafe } from './offerSafety';

import '../../exported';
import '../internal-types';

/** @type {MakeZcfSeatAdminKit} */
export const makeZcfSeatAdminKit = (
  allSeatStagings,
  zoeSeatAdmin,
  seatData,
  getMathKindByBrand,
) => {
  // The proposal and notifier are not reassigned.
  const { proposal, notifier } = seatData;

  // The currentAllocation and exited may be reassigned.
  let currentAllocation = harden(seatData.initialAllocation);
  let exited = false; // seat is "active"

  const assertExitedFalse = () => assert(!exited, X`seat has been exited`);

  /** @type {ZCFSeatAdmin} */
  const zcfSeatAdmin = Far('zcfSeatAdmin', {
    // Updates the currentAllocation of the seat, using the allocation
    // from seatStaging.
    commit: seatStaging => {
      assertExitedFalse();
      assert(
        allSeatStagings.has(seatStaging),
        X`The seatStaging ${seatStaging} was not recognized`,
      );
      currentAllocation = seatStaging.getStagedAllocation();
    },
    updateHasExited: () => {
      assertExitedFalse();
      exited = true;
    },
  });

  /** @type {ZCFSeat} */
  const zcfSeat = Far('zcfSeat', {
    exit: completion => {
      assertExitedFalse();
      zcfSeatAdmin.updateHasExited();
      E(zoeSeatAdmin).exit(completion);
    },
    fail: (
      reason = new Error(
        'Seat exited with failure. Please check the log for more information.',
      ),
    ) => {
      if (!exited) {
        zcfSeatAdmin.updateHasExited();
        E(zoeSeatAdmin).fail(harden(reason));
      }
      return reason;
    },
    // TODO(1837) remove deprecated method before Beta release.
    // deprecated as of 0.9.1-dev.3. Use fail() instead.
    kickOut: reason => zcfSeat.fail(reason),
    getNotifier: () => {
      return notifier;
    },
    hasExited: () => exited,
    getProposal: () => {
      return proposal;
    },
    getAmountAllocated: (keyword, brand) => {
      assertExitedFalse();
      if (currentAllocation[keyword] !== undefined) {
        return currentAllocation[keyword];
      }
      assert(
        brand,
        X`A brand must be supplied when the keyword is not defined`,
      );
      const mathKind = getMathKindByBrand(brand);
      return amountMath.makeEmpty(brand, mathKind);
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

      return isOfferSafe(proposal, reallocation);
    },
    stage: newAllocation => {
      assertExitedFalse();
      // Check offer safety.
      const allocation = harden({
        ...currentAllocation,
        ...newAllocation,
      });

      assert(
        isOfferSafe(proposal, allocation),
        X`The reallocation was not offer safe`,
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
