import {
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  provideDurableMapStore,
  provideDurableWeakMapStore,
  prepareExoClassKit,
  prepareKind,
  provide,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { initEmpty, M } from '@agoric/store';

import { isOfferSafe } from './offerSafety.js';
import { assertRightsConserved } from './rightsConservation.js';
import { addToAllocation, subtractFromAllocation } from './allocationMath.js';
import { coerceAmountKeywordRecord } from '../cleanProposal.js';
import {
  AmountKeywordRecordShape,
  ProposalShape,
  SeatShape,
} from '../typeGuards.js';

const { Fail } = assert;

/** @type {CreateSeatManager} */
export const createSeatManager = (
  zoeInstanceAdmin,
  getAssetKindByBrand,
  shutdownWithFailure,
  zcfBaggage = makeScalarBigMapStore('zcfBaggage', { durable: true }),
) => {
  /** @type {WeakMapStore<ZCFSeat, Allocation>}  */
  let activeZCFSeats = provideDurableWeakMapStore(zcfBaggage, 'activeZCFSeats');
  /** @type {MapStore<ZCFSeat, Allocation>} */
  const zcfSeatToStagedAllocations = provideDurableMapStore(
    zcfBaggage,
    'zcfSeatToStagedAllocations',
  );

  /** @type {WeakMapStore<ZCFSeat, SeatHandle>} */
  let zcfSeatToSeatHandle = provideDurableWeakMapStore(
    zcfBaggage,
    'zcfSeatToSeatHandle',
  );

  /** @type {(zcfSeat: ZCFSeat) => boolean} */
  const hasExited = zcfSeat => !activeZCFSeats.has(zcfSeat);

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {void}
   */
  const assertActive = zcfSeat => {
    activeZCFSeats.has(zcfSeat) || Fail`seat has been exited`;
  };

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {void}
   */
  const doExitSeat = zcfSeat => {
    assertActive(zcfSeat);
    activeZCFSeats.delete(zcfSeat);
  };

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {Allocation}
   */
  const getCurrentAllocation = zcfSeat => {
    // TODO update docs that getCurrentAllocation() fails after exit
    // https://github.com/Agoric/documentation/issues/630
    assertActive(zcfSeat);
    return activeZCFSeats.get(zcfSeat);
  };

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {void}
   */
  const commitStagedAllocation = zcfSeat => {
    // By this point, we have checked that the zcfSeat is a key in
    // activeZCFSeats and in zcfSeatToStagedAllocations.
    activeZCFSeats.set(zcfSeat, zcfSeat.getStagedAllocation());
    zcfSeatToStagedAllocations.delete(zcfSeat);
  };

  /**
   * @param {ZCFSeat} zcfSeat
   * @returns {Allocation}
   */
  const hasStagedAllocation = zcfSeatToStagedAllocations.has;

  /**
   * Get the stagedAllocation. If one does not exist, return the
   * currentAllocation. We return the currentAllocation in this case
   * so that downstream users do not have to check whether the
   * stagedAllocation is defined before adding to it or subtracting
   * from it. To check whether a stagedAllocation exists, use
   * `hasStagedAllocation`
   *
   * @param {ZCFSeat} zcfSeat
   * @returns {Allocation}
   */
  const getStagedAllocation = zcfSeat => {
    if (zcfSeatToStagedAllocations.has(zcfSeat)) {
      return zcfSeatToStagedAllocations.get(zcfSeat);
    } else {
      return activeZCFSeats.get(zcfSeat);
    }
  };

  const assertStagedAllocation = zcfSeat => {
    assert(
      hasStagedAllocation(zcfSeat),
      'Reallocate failed because a seat had no staged allocation. Please add or subtract from the seat and then reallocate.',
    );
  };

  const setStagedAllocation = (zcfSeat, newStagedAllocation) => {
    if (zcfSeatToStagedAllocations.has(zcfSeat)) {
      zcfSeatToStagedAllocations.set(zcfSeat, newStagedAllocation);
    } else {
      zcfSeatToStagedAllocations.init(zcfSeat, newStagedAllocation);
    }
  };

  /** @param {ZCFSeat} zcfSeat */
  const assertNoStagedAllocation = zcfSeat => {
    if (hasStagedAllocation(zcfSeat)) {
      Fail`The seat could not be exited with a staged but uncommitted allocation: ${getStagedAllocation(
        zcfSeat,
      )}. Please reallocate over this seat or clear the staged allocation.`;
    }
  };

  const makeZCFSeatInternal = prepareKind(
    zcfBaggage,
    'zcfSeat',
    proposal => ({ proposal }),
    {
      getSubscriber: ({ self }) => {
        return E(zoeInstanceAdmin).getExitSubscriber(
          zcfSeatToSeatHandle.get(self),
        );
      },
      getProposal: ({ state }) => state.proposal,
      exit: ({ self }, completion) => {
        assertActive(self);
        assertNoStagedAllocation(self);
        doExitSeat(self);
        E(zoeInstanceAdmin).exitSeat(zcfSeatToSeatHandle.get(self), completion);
      },
      fail: (
        { self },
        reason = new Error(
          'Seat exited with failure. Please check the log for more information.',
        ),
      ) => {
        if (typeof reason === 'string') {
          reason = Error(reason);
          assert.note(
            reason,
            'ZCFSeat.fail was called with a string reason, but requires an Error argument.',
          );
        }
        if (!hasExited(self)) {
          doExitSeat(self);
          E(zoeInstanceAdmin).failSeat(
            zcfSeatToSeatHandle.get(self),
            harden(reason),
          );
        }
        return reason;
      },
      hasExited: ({ self }) => hasExited(self),

      getAmountAllocated: ({ self }, keyword, brand) => {
        assertActive(self);
        const currentAllocation = getCurrentAllocation(self);
        if (currentAllocation[keyword] !== undefined) {
          return currentAllocation[keyword];
        }
        assert(
          brand,
          'A brand must be supplied when the keyword is not defined',
        );
        const assetKind = getAssetKindByBrand(brand);
        return AmountMath.makeEmpty(brand, assetKind);
      },
      getCurrentAllocation: ({ self }) => getCurrentAllocation(self),
      getStagedAllocation: ({ self }) => getStagedAllocation(self),
      isOfferSafe: ({ state, self }, newAllocation) => {
        assertActive(self);
        const currentAllocation = getCurrentAllocation(self);
        const reallocation = harden({
          ...currentAllocation,
          ...newAllocation,
        });

        return isOfferSafe(state.proposal, reallocation);
      },
      incrementBy: ({ self }, amountKeywordRecord) => {
        assertActive(self);
        amountKeywordRecord = coerceAmountKeywordRecord(
          amountKeywordRecord,
          getAssetKindByBrand,
        );
        setStagedAllocation(
          self,
          addToAllocation(getStagedAllocation(self), amountKeywordRecord),
        );
        return amountKeywordRecord;
      },
      decrementBy: ({ self }, amountKeywordRecord) => {
        assertActive(self);
        amountKeywordRecord = coerceAmountKeywordRecord(
          amountKeywordRecord,
          getAssetKindByBrand,
        );
        setStagedAllocation(
          self,
          subtractFromAllocation(
            getStagedAllocation(self),
            amountKeywordRecord,
          ),
        );
        return amountKeywordRecord;
      },
      clear: ({ self }) => {
        if (zcfSeatToStagedAllocations.has(self)) {
          zcfSeatToStagedAllocations.delete(self);
        }
      },
      hasStagedAllocation: ({ self }) => hasStagedAllocation(self),
    },
  );

  const replaceDurableWeakMapStore = (baggage, key) => {
    const mapStore = makeScalarBigWeakMapStore(key, { durable: true });
    baggage.set(key, mapStore);
    return mapStore;
  };

  const ZcfSeatManagerIKit = harden({
    seatManager: M.interface('ZcfSeatManager', {
      makeZCFSeat: M.call(
        M.partial({
          proposal: ProposalShape,
          initialAllocation: AmountKeywordRecordShape,
          seatHandle: SeatShape,
          offerArgs: M.any(),
        }),
      ).returns(M.remotable('zcfSeat')),
      reallocate: M.call(M.remotable('zcfSeat'), M.remotable('zcfSeat'))
        .rest(M.arrayOf(M.remotable('zcfSeat')))
        .returns(),
      dropAllReferences: M.call().returns(),
    }),
    zcfMintReallocator: M.interface('MintReallocator', {
      reallocate: M.call(SeatShape, AmountKeywordRecordShape).returns(),
    }),
  });

  const makeSeatManagerKit = prepareExoClassKit(
    zcfBaggage,
    'ZcfSeatManager',
    ZcfSeatManagerIKit,
    initEmpty,
    {
      seatManager: {
        makeZCFSeat({ proposal, initialAllocation, seatHandle }) {
          const zcfSeat = makeZCFSeatInternal(proposal);
          activeZCFSeats.init(zcfSeat, initialAllocation);
          zcfSeatToSeatHandle.init(zcfSeat, seatHandle);
          return zcfSeat;
        },

        reallocate(/** @type {ZCFSeat[]} */ ...seats) {
          seats.forEach(assertActive);
          seats.forEach(assertStagedAllocation);

          // Ensure that rights are conserved overall.
          const flattenAllocations = allocations =>
            allocations.flatMap(Object.values);
          const previousAllocations = seats.map(seat =>
            seat.getCurrentAllocation(),
          );
          const previousAmounts = flattenAllocations(previousAllocations);
          const newAllocations = seats.map(seat => seat.getStagedAllocation());
          const newAmounts = flattenAllocations(newAllocations);

          assertRightsConserved(previousAmounts, newAmounts);

          // Ensure that offer safety holds.
          for (const seat of seats) {
            isOfferSafe(seat.getProposal(), seat.getStagedAllocation()) ||
              Fail`Offer safety was violated by the proposed allocation: ${seat.getStagedAllocation()}. Proposal was ${seat.getProposal()}`;
          }

          // Keep track of seats used so far in this call, to prevent aliasing.
          const zcfSeatsSoFar = new Set();

          for (const seat of seats) {
            zcfSeatToSeatHandle.has(seat) ||
              Fail`The seat ${seat} was not recognized`;
            !zcfSeatsSoFar.has(seat) ||
              Fail`Seat (${seat}) was already an argument to reallocate`;
            zcfSeatsSoFar.add(seat);
          }

          try {
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

            seats.forEach(commitStagedAllocation);

            const seatHandleAllocations = seats.map(seat => {
              const seatHandle = zcfSeatToSeatHandle.get(seat);
              return { seatHandle, allocation: seat.getCurrentAllocation() };
            });

            E(zoeInstanceAdmin).replaceAllocations(seatHandleAllocations);
          } catch (err) {
            shutdownWithFailure(err);
            throw err;
          }
        },
        dropAllReferences() {
          activeZCFSeats = replaceDurableWeakMapStore(
            zcfBaggage,
            'activeZCFSeats',
          );
          zcfSeatToSeatHandle = replaceDurableWeakMapStore(
            zcfBaggage,
            'zcfSeatToSeatHandle',
          );
        },
      },
      zcfMintReallocator: {
        // Unlike the zcf.reallocate method, this one does not check
        // conservation, and so can be used internally for reallocations that
        // violate conservation.
        reallocate(zcfSeat, newAllocation) {
          try {
            // COMMIT POINT
            // All the effects below must succeed "atomically". Scare quotes
            // because the eventual send at the bottom is part of this
            // "atomicity" even though its effects happen later. The send occurs
            // in the order of updates from zcf to zoe, its effects must occur
            // immediately in zoe on reception, and must not fail.
            //
            // Commit the newAllocation and inform Zoe of the
            // newAllocation.

            activeZCFSeats.set(zcfSeat, newAllocation);

            const seatHandleAllocations = [
              {
                seatHandle: zcfSeatToSeatHandle.get(zcfSeat),
                allocation: newAllocation,
              },
            ];

            E(zoeInstanceAdmin).replaceAllocations(seatHandleAllocations);
          } catch (err) {
            shutdownWithFailure(err);
            throw err;
          }
        },
      },
    },
  );

  return provide(zcfBaggage, 'theSeatManagerKit', () => makeSeatManagerKit());
};
