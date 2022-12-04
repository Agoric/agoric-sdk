const { Fail, quote: q } = assert;

/**
 * @typedef {[
 *   fromSeat?: ZCFSeat,
 *   toSeat?: ZCFSeat,
 *   fromAmounts?: AmountKeywordRecord,
 *   toAmounts?: AmountKeywordRecord
 * ]} TransferArgs
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
 * @param {TransferArgs[]} transfers
 */
export const atomicRearrange = (zcf, transfers) => {
  const uniqueSeatSet = new Set();
  for (const [
    fromSeat = undefined,
    toSeat = undefined,
    _subtrahend,
    _addend,
  ] of transfers) {
    if (fromSeat) {
      uniqueSeatSet.add(fromSeat);
    }
    if (toSeat) {
      uniqueSeatSet.add(toSeat);
    }
  }
  const uniqueSeats = harden([...uniqueSeatSet.keys()]);
  for (const seat of uniqueSeats) {
    !seat.hasStagedAllocation() ||
      Fail`Cannot mix atomicRearrange with seat stagings: ${seat}`;
  }

  try {
    for (const [
      fromSeat = undefined,
      toSeat = undefined,
      fromAmounts = undefined,
      toAmounts = toSeat && fromAmounts,
    ] of transfers) {
      if (fromSeat || fromAmounts) {
        if (!fromSeat) {
          throw Fail`Transfer ${fromAmounts} from ? must have a fromSeat`;
        }
        if (!fromAmounts) {
          throw Fail`Transfer ? from ${fromSeat} must say how much`;
        }
        fromSeat.decrementBy(fromAmounts);
      }
      if (toSeat || toAmounts) {
        if (!toSeat) {
          throw Fail`Transfer ${toAmounts} into ? must have a toSeat`;
        }
        if (!toAmounts) {
          throw Fail`Transfer ? into ${toSeat} must say how much`;
        }
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
 * Sometimes a TransferArg in an atomicRearrange only expresses what amounts
 * should be taken from a seat, leaving it to other TransferArgs of the
 * same atomicRearrange to balance it out. For this case, the
 * `[fromSeat, undefined, fromAmounts]` form is more clearly expressed as
 * `fromOnly(fromSeat, fromAmounts)`. Unlike TransferArgs, both arguments to
 * `fromOnly` are non-optional, as otherwise it doesn't make much sense.
 *
 * @param {ZCFSeat} fromSeat
 * @param {AmountKeywordRecord} fromAmounts
 * @returns {TransferArgs}
 */
export const fromOnly = (fromSeat, fromAmounts) =>
  harden([fromSeat, undefined, fromAmounts]);

/**
 * Sometimes a TransferArg in an atomicRearrange only expresses what amounts
 * should be given to a seat, leaving it to other TransferArgs of the
 * same atomicRearrange to balance it out. For this case, the
 * `[undefined, toSeat, undefined, toAmounts]` form is more clearly expressed as
 * `toOnly(toSeat, toAmounts)`. Unlike TransferArgs, both arguments to
 * `toOnly` are non-optional, as otherwise it doesn't make much sense.
 *
 * @param {ZCFSeat} toSeat
 * @param {AmountKeywordRecord} toAmounts
 * @returns {TransferArgs}
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
