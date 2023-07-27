import { M } from '@agoric/store';
import { AmountKeywordRecordShape, SeatShape } from '../typeGuards.js';

export const TransferPartShape = M.splitArray(
  harden([M.opt(SeatShape), M.opt(SeatShape), M.opt(AmountKeywordRecordShape)]),
  harden([M.opt(AmountKeywordRecordShape)]),
);

/**
 * Asks Zoe (via zcf) to rearrange the allocations among the seats
 * mentioned. This is a set of changes to allocations that must satisfy
 * several constraints. If these constraints are all met, then the
 * reallocation happens atomically. Otherwise it does not happen
 * at all.
 *
 * The conditions
 *    * All the mentioned seats are still live -- enforced by ZCF.
 *    * No outstanding stagings for any of the mentioned seats.
 *      Stagings now deprecated in favor or atomicRearrange. To
 *      prevent confusion, for each reallocation, it can only be
 *      expressed in the old way or the new way, but not a mixture.
 *    * Offer safety -- enforced by ZCF.
 *    * Overall conservation -- enforced by ZCF.
 *    * The overall transfer is expressed as an array of `TransferPart`.
 *      Each individual `TransferPart` is one of
 *       - A transfer from a `fromSeat` to a `toSeat`.
 *         This is not needed for Zoe's safety, as Zoe does
           its own overall conservation check. Rather, it helps catch
           and diagnose contract bugs earlier.
 *       - A taking from a `fromSeat`'s allocation. See the `fromOnly`
           helper.
         - A giving into a `toSeat`'s allocation. See the `toOnly`
           helper.
 *
 * TODO(6679) Refactor `atomicRearrange`from being a helper into being
 * zcf's replacement for reallocate. It was made a helper during
 * the transition, to avoid interference with progress on Zoe durability.
 *
 * See the helpers below, `fromOnly`, `toOnly`, and `atomicTransfer`,
 * which will remain helpers. These helper are for convenience
 * in expressing atomic rearrangements clearly.
 *
 * @deprecated use the zcf builtin instead
 *
 * @param {ZCF} zcf
 * @param {TransferPart[]} transfers
 */
export const atomicRearrange = (zcf, transfers) => {
  zcf.atomicRearrange(transfers);
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
) => zcf.atomicRearrange(harden([[fromSeat, toSeat, fromAmounts, toAmounts]]));
