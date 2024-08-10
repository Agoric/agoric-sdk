import { Fail } from '@endo/errors';
import { makeScalarMapStore } from '@agoric/vat-data';

import { assertRightsConserved } from './rightsConservation.js';
import { addToAllocation, subtractFromAllocation } from './allocationMath.js';

/** @typedef {Array<AmountKeywordRecord>} TransactionList */

/**
 * Convert from a list of transfer descriptions ([fromSeat, toSeat, fromAmount,
 * toAmount], with many parts optional) to a list of resulting allocations for
 * each of the seats mentioned.
 *
 * @param {Array<TransferPart>} transfers
 * @returns {[ZCFSeat, AmountKeywordRecord][]}
 */
export const makeAllocationMap = transfers => {
  /** @type {MapStore<ZCFSeat, [TransactionList, TransactionList]>} */
  const allocations = makeScalarMapStore();

  const getAllocations = seat => {
    if (allocations.has(seat)) {
      return allocations.get(seat);
    }

    /** @type {[TransactionList, TransactionList]} */
    const pair = [[], []];
    allocations.init(seat, pair);
    return pair;
  };

  const decrementAllocation = (seat, decrement) => {
    const [incr, decr] = getAllocations(seat);

    const newDecr = [...decr, decrement];
    allocations.set(seat, [incr, newDecr]);
  };

  const incrementAllocation = (seat, increment) => {
    const [incr, decr] = getAllocations(seat);

    const newIncr = [...incr, increment];
    allocations.set(seat, [newIncr, decr]);
  };

  for (const [fromSeat, toSeat, fromAmounts, toAmounts] of transfers) {
    if (fromSeat) {
      if (!fromAmounts) {
        throw Fail`Transfer from ${fromSeat} must say how much`;
      }
      decrementAllocation(fromSeat, fromAmounts);
      if (toSeat) {
        // Conserved transfer between seats
        if (toAmounts) {
          // distinct amounts, so we check conservation.
          assertRightsConserved(
            Object.values(fromAmounts),
            Object.values(toAmounts),
          );
          incrementAllocation(toSeat, toAmounts);
        } else {
          // fromAmounts will be used for toAmounts as well
          incrementAllocation(toSeat, fromAmounts);
        }
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
      incrementAllocation(toSeat, toAmounts);
    }
  }

  /** @type {[ZCFSeat,AmountKeywordRecord][]} */
  const resultingAllocations = [];
  for (const [seat, [incrList, decrList]] of allocations.entries()) {
    let newAlloc = seat.getCurrentAllocation();
    for (const incr of incrList) {
      newAlloc = addToAllocation(newAlloc, incr);
    }
    for (const decr of decrList) {
      newAlloc = subtractFromAllocation(newAlloc, decr);
    }
    resultingAllocations.push([seat, newAlloc]);
  }
  return resultingAllocations;
};
