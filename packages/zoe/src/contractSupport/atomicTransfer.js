import { fit, M } from '@agoric/store';
import { assertRightsConserved } from '../contractFacet/rightsConservation.js';

const { Fail, quote: q } = assert;

/**
 * @typedef {[
 *   fromSeat?: ZCFSeat,
 *   toSeat?: ZCFSeat,
 *   fromAmounts?: AmountKeywordRecord,
 *   toAmounts?: AmountKeywordRecord
 * ]} TransferPart
 */

/**
 * TODO Refactor from being a helper into being zcf's replacement for
 * reallocate. Is currently a helper during the transition, to avoid
 * interference with progress on Zoe durability.
 *
 * See the helpers below, `fromOnly`, `toOnly`, and `atomicTransfer`,
 * which will remain helpers, for further conveniences for expressing
 * atomic rearragements clearly.
 *
 * @param {ZCF} zcf
 * @param {TransferPart[]} transfers
 */
export const atomicRearrange = (zcf, transfers) => {
  fit(transfers, M.arrayOf(M.array()), 'transfers');
  const uniqueSeatSet = new Set();
  for (const [
    fromSeat = undefined,
    toSeat = undefined,
    fromAmounts = undefined,
    toAmounts = undefined,
  ] of transfers) {
    if (fromSeat) {
      if (!fromAmounts) {
        throw Fail`Transfer from ${fromSeat} must say how much`;
      }
      uniqueSeatSet.add(fromSeat);
      if (toSeat) {
        // Conserved transfer between seats
        if (toAmounts) {
          // distinct amounts, so we check conservation.
          // Note that this is not needed for Zoe's safety, as Zoe does
          // its own overall conservation check. Rather, it helps catch
          // and diagnose contract bugs earlier.
          assertRightsConserved(
            Object.values(fromAmounts),
            Object.values(toAmounts),
          );
        } // else fromAmounts will be used as toAmounts
        uniqueSeatSet.add(toSeat);
      } else {
        // Transfer only from fromSeat
        !toAmounts ||
          Fail`Transfer without toSeat cannot have toAmounts ${toAmounts}`;
      }
    } else {
      toSeat || Fail`Transfer must have at least one of fromSeat or toSeat`;
      // Transfer only to toSeat
      !fromAmounts ||
        Fail`Transfer without fromSeat cannot have fromAmounts ${fromAmounts}`;
      toAmounts || Fail`Transfer to ${toSeat} must say how much`;
      uniqueSeatSet.add(toSeat);
    }
  }

  const uniqueSeats = harden([...uniqueSeatSet.keys()]);
  for (const seat of uniqueSeats) {
    !seat.hasStagedAllocation() ||
      Fail`Cannot mix atomicRearrange with seat stagings: ${seat}`;
  }

  // At this point the basic shape has been validated

  try {
    for (const [
      fromSeat = undefined,
      toSeat = undefined,
      fromAmounts = undefined,
      toAmounts = toSeat && fromAmounts,
    ] of transfers) {
      if (fromSeat && fromAmounts) {
        // testing both just to satisfy the type checker
        fromSeat.decrementBy(fromAmounts);
      }
      if (toSeat && toAmounts) {
        // testing both just to satisfy the type checker
        toSeat.incrementBy(toAmounts);
      }
    }

    // Perhaps deprecate this >= 2 restriction?
    uniqueSeats.length >= 2 ||
      Fail`Can only commit a reallocation among at least 2 seats: ${q(
        uniqueSeats.length,
      )}`;
    // Take it apart and put it back together to satisfy the type checker
    const [seat0, seat1, ...restSeats] = uniqueSeats;
    zcf.reallocate(seat0, seat1, ...restSeats);
  } finally {
    for (const seat of uniqueSeats) {
      seat.clear();
    }
  }
};

/**
 * Sometimes a TransferPart in an atomicRearrange only expresses what amounts
 * should be taken from a seat, leaving it to other TransferPart of the
 * same atomicRearrange to balance it out. For this case, the
 * `[fromSeat, undefined, fromAmounts]` form is more clearly expressed as
 * `fromOnly(fromSeat, fromAmounts)`. Unlike TransferPart, both arguments to
 * `fromOnly` are non-optional, as otherwise it doesn't make much sense.
 *
 * @param {ZCFSeat} fromSeat
 * @param {AmountKeywordRecord} fromAmounts
 * @returns {TransferPart}
 */
export const fromOnly = (fromSeat, fromAmounts) =>
  harden([fromSeat, undefined, fromAmounts]);

/**
 * Sometimes a TransferPart in an atomicRearrange only expresses what amounts
 * should be given to a seat, leaving it to other TransferPart of the
 * same atomicRearrange to balance it out. For this case, the
 * `[undefined, toSeat, undefined, toAmounts]` form is more clearly expressed as
 * `toOnly(toSeat, toAmounts)`. Unlike TransferPart, both arguments to
 * `toOnly` are non-optional, as otherwise it doesn't make much sense.
 *
 * @param {ZCFSeat} toSeat
 * @param {AmountKeywordRecord} toAmounts
 * @returns {TransferPart}
 */
export const toOnly = (toSeat, toAmounts) =>
  harden([undefined, toSeat, undefined, toAmounts]);

/**
 * Special case of atomicRearrange for a single one-way transfer
 *
 * @param {ZCF} zcf
 * @param {ZCFSeat} [fromSeat]
 * @param {ZCFSeat} [toSeat]
 * @param {AmountKeywordRecord} [fromAmounts]
 * @param {AmountKeywordRecord} [toAmounts]
 */
export const atomicTransfer = (
  zcf,
  fromSeat = undefined,
  toSeat = undefined,
  fromAmounts = undefined,
  toAmounts = undefined,
) => atomicRearrange(zcf, harden([[fromSeat, toSeat, fromAmounts, toAmounts]]));
