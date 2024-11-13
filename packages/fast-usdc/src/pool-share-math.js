import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import {
  divideBy,
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Fail, q } from '@endo/errors';

const { getValue, add, isEmpty, isGTE, subtract } = AmountMath;

/**
 * Invariant: shareWorth is the pool balance divided by shares outstanding.
 *
 * Use `makeParity(make(USDC, epsilon), PoolShares)` for an initial
 * value, for some negligible `epsilon` such as 1n.
 *
 * @typedef {Ratio} ShareWorth
 */

/**
 * Make a 1-to-1 ratio between amounts of 2 brands.
 *
 * @param {Amount<'nat'>} numerator
 * @param {Brand<'nat'>} denominatorBrand
 */
export const makeParity = (numerator, denominatorBrand) => {
  const value = getValue(numerator.brand, numerator);
  return makeRatio(value, numerator.brand, value, denominatorBrand);
};

/**
 * @typedef {{
 *   deposit: {
 *     give: { USDC: Amount<'nat'> },
 *     want?: { PoolShare: Amount<'nat'> }
 *   },
 *   withdraw: {
 *     give: { PoolShare: Amount<'nat'> }
 *     want: { USDC: Amount<'nat'> },
 *   }
 * }} USDCProposalShapes
 */

/**
 * Compute Shares payout from a deposit proposal, as well as updated shareWorth.
 *
 * Clearly:
 *
 * sharesOutstanding' = sharesOutstanding + Shares
 * poolBalance' = poolBalance + ToPool
 * shareWorth' = poolBalance' / sharesOutstanding'
 *
 * In order to maintain the ShareWorth invariant, we need:
 *
 * Shares = ToPool / shareWorth'
 *
 * Solving for Shares gives:
 *
 * Shares = ToPool * sharesOutstanding / poolBalance
 *
 * that is:
 *
 * Shares = ToPool / shareWorth
 *
 * @param {ShareWorth} shareWorth previous to the deposit
 * @param {USDCProposalShapes['deposit']} proposal
 * @returns {{ payouts: { PoolShare: Amount<'nat'> }; shareWorth: ShareWorth }}
 */
export const depositCalc = (shareWorth, { give, want }) => {
  assert(!isEmpty(give.USDC)); // nice diagnostic provided by proposalShape

  const { denominator: sharesOutstanding, numerator: poolBalance } = shareWorth;

  const fairPoolShare = divideBy(give.USDC, shareWorth);
  if (want?.PoolShare) {
    isGTE(fairPoolShare, want.PoolShare) ||
      Fail`deposit cannot pay out ${q(want.PoolShare)}; ${q(give.USDC)} only gets ${q(fairPoolShare)}`;
  }
  const outstandingPost = add(sharesOutstanding, fairPoolShare);
  const balancePost = add(poolBalance, give.USDC);
  const worthPost = makeRatioFromAmounts(balancePost, outstandingPost);
  return harden({
    payouts: { PoolShare: fairPoolShare },
    shareWorth: worthPost,
  });
};

/**
 * Compute payout from a withdraw proposal, along with updated shareWorth
 *
 * @param {ShareWorth} shareWorth
 * @param {USDCProposalShapes['withdraw']} proposal
 * @returns {{ shareWorth: ShareWorth, payouts: { USDC: Amount<'nat'> }}}
 */
export const withdrawCalc = (shareWorth, { give, want }) => {
  assert(!isEmpty(give.PoolShare));
  assert(!isEmpty(want.USDC));

  const payout = multiplyBy(give.PoolShare, shareWorth);
  isGTE(payout, want.USDC) ||
    Fail`cannot withdraw ${q(want.USDC)}; ${q(give.PoolShare)} only worth ${q(payout)}`;
  const { denominator: sharesOutstanding, numerator: poolBalance } = shareWorth;
  !isGTE(want.USDC, poolBalance) ||
    Fail`cannot withdraw ${q(want.USDC)}; only ${q(poolBalance)} in pool`;
  const balancePost = subtract(poolBalance, payout);
  // giving more shares than are outstanding is impossible,
  // so it's not worth a custom diagnostic. subtract will fail
  const outstandingPost = subtract(sharesOutstanding, give.PoolShare);

  const worthPost = makeRatioFromAmounts(balancePost, outstandingPost);
  return harden({ shareWorth: worthPost, payouts: { USDC: payout } });
};

/**
 * @param {ShareWorth} shareWorth
 * @param {Amount<'nat'>} fees
 */
export const withFees = (shareWorth, fees) => {
  const balancePost = add(shareWorth.numerator, fees);
  return makeRatioFromAmounts(balancePost, shareWorth.denominator);
};
