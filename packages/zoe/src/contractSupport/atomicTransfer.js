const { details: X, quote: q } = assert;

/**
 * @typedef {[
 *   fromSeat?: ZCFSeat,
 *   toSeat?: ZCFSeat,
 *   subtrahend?: AmountKeywordRecord,
 *   addend?: AmountKeywordRecord
 * ]} TransferArgs
 */

/**
 * TODO Refactor from being a helper into being zcf's replacement for
 * reallocate. Is currently a helper during the transition, to avoid
 * interference with progress on Zoe durability.
 *
 * @param {ZCF} zcf
 * @param {TransferArgs[]} transfers
 */
export const atomicTransfer = (zcf, transfers) => {
  const uniqueSeatSet = new Set();
  for (const [
    fromSeat = undefined,
    toSeat = undefined,
    _subtrahend,
    _addend,
  ] of transfers) {
    fromSeat && uniqueSeatSet.add(fromSeat);
    toSeat && uniqueSeatSet.add(toSeat);
  }
  const uniqueSeats = harden([...uniqueSeatSet.keys()]);
  for (const seat of uniqueSeats) {
    !seat.hasStagedAllocation() ||
      assert.fail(X`Cannot mix atomicTransfer with seat stagings: ${seat}`);
  }

  try {
    for (const [
      fromSeat = undefined,
      toSeat = undefined,
      subtrahend = undefined,
      addend = subtrahend,
    ] of transfers) {
      if (fromSeat || subtrahend) {
        if (!fromSeat) {
          assert.fail(X`Transfer ${subtrahend} from ? must have a fromSeat`);
        }
        if (!subtrahend) {
          assert.fail(X`Transfer ? from ${fromSeat} must say how much`);
        }
        fromSeat.decrementBy(subtrahend);
      }
      if (toSeat || addend) {
        if (!toSeat) {
          assert.fail(X`Transfer ${addend} into ? must have a toSeat`);
        }
        if (!addend) {
          assert.fail(X`Transfer ? into ${toSeat} must say how much`);
        }
        toSeat.incrementBy(addend);
      }
    }

    // Perhaps deprecate this >= 2 restriction?
    uniqueSeats.length >= 2 ||
      assert.fail(
        X`Can only commit a reallocation among at least 2 seats: ${q(
          uniqueSeats.length,
        )}`,
      );
    // Take it apart and put it back together to satisfy the type checker
    const [seat0, seat1, ...restSeats] = uniqueSeats;
    zcf.reallocate(seat0, seat1, ...restSeats);
  } finally {
    for (const seat of uniqueSeats) {
      seat.clear();
    }
  }
};
