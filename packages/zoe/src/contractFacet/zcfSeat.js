import { annotateError, Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import {
  makeScalarBigWeakMapStore,
  prepareExoClass,
  prepareExoClassKit,
  provide,
  provideDurableMapStore,
  provideDurableWeakMapStore,
} from '@agoric/vat-data';
import { AmountMath } from '@agoric/ertp';
import { initEmpty, M } from '@agoric/store';

import { isOfferSafe } from './offerSafety.js';
import { assertRightsConserved } from './rightsConservation.js';
import { addToAllocation, subtractFromAllocation } from './allocationMath.js';
import { coerceAmountKeywordRecord } from '../cleanProposal.js';
import {
  AmountKeywordRecordShape,
  SeatDataShape,
  SeatShape,
} from '../typeGuards.js';
import { makeAllocationMap } from './reallocate.js';
import { TransferPartShape } from '../contractSupport/atomicTransfer.js';

/**
 * The SeatManager holds the active zcfSeats and can reallocate and
 * make new zcfSeats.
 *
 * @param {ERef<ZoeInstanceAdmin>} zoeInstanceAdmin
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @param {import('@agoric/swingset-vat').ShutdownWithFailure} shutdownWithFailure
 * @param {import('@agoric/vat-data').Baggage} zcfBaggage
 * @returns {{ seatManager: ZcfSeatManager, zcfMintReallocator: ZcfMintReallocator }}
 */
export const createSeatManager = (
  zoeInstanceAdmin,
  getAssetKindByBrand,
  shutdownWithFailure,
  zcfBaggage,
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
    hasStagedAllocation(zcfSeat) ||
      Fail`Reallocate failed because a seat had no staged allocation. Please add or subtract from the seat and then reallocate.`;
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

  const ZCFSeatI = M.interface('ZCFSeat', {}, { sloppy: true });

  const makeZCFSeatInternal = prepareExoClass(
    zcfBaggage,
    'zcfSeat',
    ZCFSeatI,
    proposal => ({ proposal }),
    {
      getSubscriber() {
        const { self } = this;
        return E(zoeInstanceAdmin).getExitSubscriber(
          zcfSeatToSeatHandle.get(self),
        );
      },
      getProposal() {
        const { state } = this;
        return state.proposal;
      },
      exit(completion) {
        const { self } = this;
        assertActive(self);
        assertNoStagedAllocation(self);
        doExitSeat(self);
        void E(zoeInstanceAdmin).exitSeat(
          zcfSeatToSeatHandle.get(self),
          completion,
        );
        zcfSeatToSeatHandle.delete(self);
      },
      fail(
        reason = Error(
          'Seat exited with failure. Please check the log for more information.',
        ),
      ) {
        const { self } = this;
        if (typeof reason === 'string') {
          reason = Error(reason);
          annotateError(
            reason,
            'ZCFSeat.fail was called with a string reason, but requires an Error argument.',
          );
        }
        if (!hasExited(self)) {
          doExitSeat(self);
          void E(zoeInstanceAdmin).failSeat(
            zcfSeatToSeatHandle.get(self),
            harden(reason),
          );
          zcfSeatToSeatHandle.delete(self);
        }
        return reason;
      },
      hasExited() {
        const { self } = this;
        return hasExited(self);
      },

      /**
       * @type {ZCFSeat['getAmountAllocated']}
       */
      getAmountAllocated(keyword, brand) {
        const { self } = this;
        assertActive(self);
        const currentAllocation = getCurrentAllocation(self);
        if (currentAllocation[keyword] !== undefined) {
          // @ts-expect-error never checks brand
          return currentAllocation[keyword];
        }
        if (!brand) {
          throw Fail`A brand must be supplied when the keyword is not defined`;
        }
        const assetKind = getAssetKindByBrand(brand);
        // @ts-expect-error cast
        return AmountMath.makeEmpty(brand, assetKind);
      },
      getCurrentAllocation() {
        const { self } = this;
        return getCurrentAllocation(self);
      },
      getStagedAllocation() {
        const { self } = this;
        return getStagedAllocation(self);
      },
      isOfferSafe(newAllocation) {
        const { state, self } = this;
        assertActive(self);
        const currentAllocation = getCurrentAllocation(self);
        const reallocation = harden({
          ...currentAllocation,
          ...newAllocation,
        });

        return isOfferSafe(state.proposal, reallocation);
      },
      /**
       * @deprecated switch to zcf.atomicRearrange()
       * @param {AmountKeywordRecord} amountKeywordRecord
       */
      incrementBy(amountKeywordRecord) {
        const { self } = this;
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
      /**
       * @deprecated switch to zcf.atomicRearrange()
       * @param {AmountKeywordRecord} amountKeywordRecord
       */
      decrementBy(amountKeywordRecord) {
        const { self } = this;
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
      clear() {
        const { self } = this;
        if (zcfSeatToStagedAllocations.has(self)) {
          zcfSeatToStagedAllocations.delete(self);
        }
      },
      hasStagedAllocation() {
        const { self } = this;
        return hasStagedAllocation(self);
      },
    },
  );

  const replaceDurableWeakMapStore = (baggage, key) => {
    const mapStore = makeScalarBigWeakMapStore(key, { durable: true });
    baggage.set(key, mapStore);
    return mapStore;
  };

  const ZcfSeatManagerIKit = harden({
    seatManager: M.interface('ZcfSeatManager', {
      makeZCFSeat: M.call(SeatDataShape).returns(M.remotable('zcfSeat')),
      atomicRearrange: M.call(M.arrayOf(TransferPartShape)).returns(),
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

        /**
         * Rearrange the allocations according to the transfer descriptions.
         * This is a set of changes to allocations that must satisfy several
         * constraints. If these constraints are all met, then the reallocation
         * happens atomically. Otherwise, it does not happen at all.
         *
         * The conditions
         *    * All the mentioned seats are still live,
         *    * No outstanding stagings for any of the mentioned seats. Stagings
         *      have been deprecated in favor or atomicRearrange. To prevent
         *      confusion, for each reallocation, it can only be expressed in
         *      the old way or the new way, but not a mixture.
         *    * Offer safety
         *    * Overall conservation
         *
         * The overall transfer is expressed as an array of `TransferPart`. Each
         * individual `TransferPart` is one of
         * - A transfer from a `fromSeat` to a `toSeat`. Specify both toAmount
         *     and fromAmount to change keywords, otherwise only fromAmount is required.
         * - A taking from a `fromSeat`'s allocation. See the `fromOnly` helper.
         * - A giving into a `toSeat`'s allocation. See the `toOnly` helper.
         *
         * @param {TransferPart[]} transfers
         */
        atomicRearrange(transfers) {
          const newAllocations = makeAllocationMap(transfers);

          // ////// All Seats are active /////////////////////////////////
          for (const [seat] of newAllocations) {
            assertActive(seat);
            !seat.hasStagedAllocation() ||
              Fail`Cannot mix atomicRearrange with seat stagings: ${seat}`;
            zcfSeatToSeatHandle.has(seat) ||
              Fail`The seat ${seat} was not recognized`;
          }

          // ////// Ensure that rights are conserved overall /////////////

          // convert array of keywordAmountRecords to 1-level array of Amounts
          const flattenAmounts = allocations =>
            allocations.flatMap(Object.values);
          const previousAmounts = flattenAmounts(
            newAllocations.map(([seat]) => seat.getCurrentAllocation()),
          );
          const newAmounts = flattenAmounts(
            newAllocations.map(([_, allocation]) => allocation),
          );
          assertRightsConserved(previousAmounts, newAmounts);

          // ////// Ensure that offer safety holds ///////////////////////
          for (const [seat, allocation] of newAllocations) {
            isOfferSafe(seat.getProposal(), allocation) ||
              Fail`Offer safety was violated by the proposed allocation: ${allocation}. Proposal was ${seat.getProposal()}`;
          }

          const seatHandleAllocations = newAllocations.map(
            ([seat, allocation]) => {
              const seatHandle = zcfSeatToSeatHandle.get(seat);
              return { allocation, seatHandle };
            },
          );
          try {
            // No side effects above. All conditions checked which could have
            // caused us to reject this reallocation. Notice that the current
            // allocations are captured in seatHandleAllocations, so there must
            // be no awaits between that assignment and here.
            //
            // COMMIT POINT
            //
            // The effects must succeed atomically. The call to
            // replaceAllocations() will be processed in the order of updates
            // from ZCF to Zoe. Its effects must occur immediately in Zoe on
            // reception, and must not fail.
            //
            // Commit the new allocations (currentAllocation is replaced
            // for each of the seats) and inform Zoe of the new allocation.

            for (const [seat, allocation] of newAllocations) {
              activeZCFSeats.set(seat, allocation);
            }

            // we don't wait for the results here. As described in
            // docs/zoe-zcf.md, The initial allocation to a seat originates with
            // Zoe, but *all subsequent updates come from ZCF to Zoe*.
            void E(zoeInstanceAdmin).replaceAllocations(seatHandleAllocations);
          } catch (err) {
            shutdownWithFailure(err);
            throw err;
          }
        },
        reallocate(/** @type {ZCFSeat[]} */ ...seats) {
          for (const seat of seats) {
            assertActive(seat);
            assertStagedAllocation(seat);
          }

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

            for (const seat of seats) {
              commitStagedAllocation(seat);
            }
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
