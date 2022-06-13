// @ts-check
import { AmountMath } from '@agoric/ertp';
import { M } from '@agoric/store';

const { details: X, quote: q } = assert;

export const amountPattern = harden({ brand: M.remotable(), value: M.any() });
export const ratioPattern = harden({
  numerator: amountPattern,
  denominator: amountPattern,
});

/**
 * Apply a delta to the `base` Amount, where the delta is represented as
 * an amount to gain and an amount to lose. Typically one of those will
 * be empty because gain/loss comes from the give/want for a specific asset
 * on a proposal. We use two Amounts because an Amount cannot represent
 * a negative number (so we use a "loss" that will be subtracted).
 *
 * @param {Amount} base
 * @param {Amount} gain
 * @param {Amount} loss
 * @returns {Amount}
 */
export const addSubtract = (base, gain, loss) =>
  AmountMath.subtract(AmountMath.add(base, gain), loss);

/**
 * @param {ProposalRecord} proposal
 * @param {string[]} keys usually 'Collateral' and 'Minted'
 */
export const assertOnlyKeys = (proposal, keys) => {
  /** @param { AmountKeywordRecord } clause */
  const onlyKeys = clause =>
    Object.getOwnPropertyNames(clause).every(c => keys.includes(c));
  assert(
    onlyKeys(proposal.give),
    X`extraneous terms in give: ${proposal.give}`,
  );
  assert(
    onlyKeys(proposal.want),
    X`extraneous terms in want: ${proposal.want}`,
  );
};

/**
 * Stage a transfer between `fromSeat` and `toSeat`, specified as the delta between
 * the gain and a loss on the `fromSeat`. The gain/loss are typically from the
 * give/want respectively of a proposal. The `key` is the allocation keyword.
 *
 * @param {ZCFSeat} fromSeat
 * @param {ZCFSeat} toSeat
 * @param {Amount} fromLoses
 * @param {Amount} fromGains
 * @param {Keyword} key
 */
export const stageDelta = (fromSeat, toSeat, fromLoses, fromGains, key) => {
  // Must check `isEmpty`; can't subtract `empty` from a missing allocation.
  if (!AmountMath.isEmpty(fromLoses)) {
    toSeat.incrementBy(fromSeat.decrementBy(harden({ [key]: fromLoses })));
  }
  if (!AmountMath.isEmpty(fromGains)) {
    fromSeat.incrementBy(toSeat.decrementBy(harden({ [key]: fromGains })));
  }
};

/**
 * @param {Amount<'nat'>} debtLimit
 * @param {Amount<'nat'>} totalDebt
 * @param {Amount<'nat'>} toMint
 * @throws if minting would exceed total debt
 */
export const checkDebtLimit = (debtLimit, totalDebt, toMint) => {
  const debtPost = AmountMath.add(totalDebt, toMint);
  assert(
    !AmountMath.isGTE(debtPost, debtLimit),
    X`Minting ${q(toMint)} past ${q(totalDebt)} would hit total debt limit ${q(
      debtLimit,
    )}`,
  );
};
