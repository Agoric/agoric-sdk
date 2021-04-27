// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import { isOfferSafe } from './offerSafety';
import { assertRightsConserved } from './rightsConservation';

/** @type {CreateSeatManager} */
export const createSeatManager = (zoeInstanceAdmin, getMathKindByBrand) => {
  /** @type {WeakStore<ZCFSeat, Allocation>}  */
  let activeZCFSeats = makeNonVOWeakStore('zcfSeat');

  /** @type {WeakStore<SeatStaging, SeatHandle>} */
  let seatStagingToSeatHandle = makeNonVOWeakStore('seatStaging');

  /** @type {(zcfSeat: ZCFSeat) => boolean} */
  const hasExited = zcfSeat => !activeZCFSeats.has(zcfSeat);

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {void}
   */
  const assertActive = zcfSeat => {
    assert(activeZCFSeats.has(zcfSeat), X`seat has been exited`);
  };

  const doExitSeat = zcfSeat => {
    assertActive(zcfSeat);
    activeZCFSeats.delete(zcfSeat);
  };

  const getCurrentAllocation = zcfSeat => {
    assertActive(zcfSeat);
    return activeZCFSeats.get(zcfSeat);
  };

  const commitSeatStaging = seatStaging => {
    assert(
      seatStagingToSeatHandle.has(seatStaging),
      X`The seatStaging ${seatStaging} was not recognized`,
    );
    const zcfSeat = seatStaging.getSeat();
    assertActive(zcfSeat);
    activeZCFSeats.set(zcfSeat, seatStaging.getStagedAllocation());
  };

  /**
   * Unlike the zcf.reallocate method, this one does not check conservation,
   * and so can be used internally for reallocations that violate
   * conservation.
   *
   * @type {ReallocateInternal}
   */
  const reallocateInternal = seatStagings => {
    // Keep track of seats used so far in this call, to prevent aliasing.
    const zcfSeatsSoFar = new WeakSet();

    seatStagings.forEach(seatStaging => {
      assert(
        seatStagingToSeatHandle.has(seatStaging),
        X`The seatStaging ${seatStaging} was not recognized`,
      );
      const zcfSeat = seatStaging.getSeat();
      assert(
        !zcfSeatsSoFar.has(zcfSeat),
        X`Seat (${zcfSeat}) was already an argument to reallocate`,
      );
      zcfSeatsSoFar.add(zcfSeat);
    });

    // No side effects above. All conditions checked which could have
    // caused us to reject this reallocation.
    // COMMIT POINT
    // All the effects below must succeed "atomically". Scare quotes because
    // the eventual send at the bottom is part of this "atomicity" even
    // though its effects happen later. The send occurs in the order of
    // updates from zcf to zoe, its effects must occur immediately in zoe
    // on reception, and must not fail.
    //
    // Commit the staged allocations (currentAllocation is replaced
    // for each of the seats) and inform Zoe of the
    // newAllocation.

    seatStagings.forEach(commitSeatStaging);

    const seatHandleAllocations = seatStagings.map(seatStaging => {
      const zcfSeat = seatStaging.getSeat();
      const seatHandle = seatStagingToSeatHandle.get(seatStaging);
      return { seatHandle, allocation: zcfSeat.getCurrentAllocation() };
    });

    seatStagings.forEach(seatStagingToSeatHandle.delete);

    E(zoeInstanceAdmin).replaceAllocations(seatHandleAllocations);
  };

  const reallocate = (/** @type {SeatStaging[]} */ ...seatStagings) => {
    // We may want to handle this with static checking instead.
    // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
    assert(
      seatStagings.length >= 2,
      X`reallocating must be done over two or more seats`,
    );

    // Ensure that rights are conserved overall. Offer safety was
    // already checked when an allocation was staged for an individual seat.
    const flattenAllocations = allocations =>
      allocations.flatMap(Object.values);

    const previousAllocations = seatStagings.map(seatStaging =>
      seatStaging.getSeat().getCurrentAllocation(),
    );
    const previousAmounts = flattenAllocations(previousAllocations);

    const newAllocations = seatStagings.map(seatStaging =>
      seatStaging.getStagedAllocation(),
    );
    const newAmounts = flattenAllocations(newAllocations);

    assertRightsConserved(previousAmounts, newAmounts);

    reallocateInternal(seatStagings);
  };

  /** @type {MakeZCFSeat} */
  const makeZCFSeat = (
    zoeSeatAdmin,
    { proposal, notifier, initialAllocation, seatHandle },
  ) => {
    /** @type {ZCFSeat} */
    const zcfSeat = Far('zcfSeat', {
      getNotifier: () => notifier,
      getProposal: () => proposal,
      exit: completion => {
        doExitSeat(zcfSeat);
        E(zoeSeatAdmin).exit(completion);
      },
      fail: (
        reason = new Error(
          'Seat exited with failure. Please check the log for more information.',
        ),
      ) => {
        if (typeof reason === 'string') {
          reason = Error(reason);
          assert.note(
            reason,
            X`ZCFSeat.fail was called with a string reason, but requires an Error argument.`,
          );
        }
        if (!hasExited(zcfSeat)) {
          doExitSeat(zcfSeat);
          E(zoeSeatAdmin).fail(harden(reason));
        }
        return reason;
      },
      hasExited: () => hasExited(zcfSeat),

      getAmountAllocated: (keyword, brand) => {
        assertActive(zcfSeat);
        const currentAllocation = getCurrentAllocation(zcfSeat);
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
      getCurrentAllocation: () => getCurrentAllocation(zcfSeat),
      isOfferSafe: newAllocation => {
        assertActive(zcfSeat);
        const currentAllocation = getCurrentAllocation(zcfSeat);
        const reallocation = harden({
          ...currentAllocation,
          ...newAllocation,
        });

        return isOfferSafe(proposal, reallocation);
      },
      stage: newAllocation => {
        assertActive(zcfSeat);
        const currentAllocation = getCurrentAllocation(zcfSeat);
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
        seatStagingToSeatHandle.init(seatStaging, seatHandle);
        return seatStaging;
      },
    });

    activeZCFSeats.init(zcfSeat, initialAllocation);

    return zcfSeat;
  };

  /** @type {DropAllReferences} */
  const dropAllReferences = () => {
    activeZCFSeats = makeNonVOWeakStore('zcfSeat');
    seatStagingToSeatHandle = makeNonVOWeakStore('seatStaging');
  };

  return harden({
    makeZCFSeat,
    reallocate,
    reallocateInternal,
    dropAllReferences,
  });
};
