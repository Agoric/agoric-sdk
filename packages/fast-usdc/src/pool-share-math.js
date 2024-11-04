import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import {
  divideBy,
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Fail, q } from '@endo/errors';

const { getValue, add, isEmpty, isEqual, isGTE, subtract } = AmountMath;

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
 * @param {Amount<'nat'>} ToPool as in give.ToPool
 * @param {Amount<'nat'>} [wantShares] as in want.Shares
 * @returns {{ Shares: Amount<'nat'>; shareWorth: ShareWorth }}
 */
export const deposit = (shareWorth, ToPool, wantShares) => {
  assert(!isEmpty(ToPool)); // nice diagnostic provided by proposalShape

  const { denominator: sharesOutstanding, numerator: poolBalance } = shareWorth;

  const Shares = divideBy(ToPool, shareWorth); // TODO: floorDivideBy???
  if (wantShares) {
    isGTE(Shares, wantShares) ||
      Fail`deposit cannot pay out ${q(wantShares)}; ${q(ToPool)} only gets ${q(Shares)}`;
  }
  const outstandingPost = add(sharesOutstanding, Shares);
  const balancePost = add(poolBalance, ToPool);
  const worthPost = makeRatioFromAmounts(balancePost, outstandingPost);
  return harden({ Shares, shareWorth: worthPost });
};

/**
 * @param {Record<'pool' | 'lp' | 'mint', ZCFSeat>} seats
 * @param {Record<'Shares' | 'ToPool', Amount<'nat'>>} amounts
 * @returns {TransferPart[]}
 */
export const depositTransfers = (seats, { ToPool, Shares }) =>
  harden([
    [seats.lp, seats.pool, { ToPool }, { Pool: ToPool }],
    [seats.mint, seats.lp, { Shares }],
  ]);

/**
 * Compute payout from a withdraw proposal, along with updated shareWorth
 *
 * @param {ShareWorth} shareWorth
 * @param {Amount<'nat'>} Shares from give
 * @param {Amount<'nat'>} FromPool from want
 * @returns {{ shareWorth: ShareWorth, FromPool: Amount<'nat'> }}
 */
export const withdraw = (shareWorth, Shares, FromPool) => {
  assert(!isEmpty(Shares));
  assert(!isEmpty(FromPool));

  const payout = multiplyBy(Shares, shareWorth);
  isGTE(payout, FromPool) ||
    Fail`cannot withdraw ${q(FromPool)}; ${q(Shares)} only worth ${q(payout)}`;
  const { denominator: sharesOutstanding, numerator: poolBalance } = shareWorth;
  isGTE(poolBalance, FromPool) ||
    Fail`cannot withdraw ${q(FromPool)}; only ${q(poolBalance)} in pool`;
  !isEqual(FromPool, poolBalance) ||
    Fail`cannot withdraw ${q(FromPool)}; pool cannot be empty`;
  const balancePost = subtract(poolBalance, payout);
  // giving more shares than are outstanding is impossible,
  // so it's not worth a custom diagnostic. subtract will fail
  const outstandingPost = subtract(sharesOutstanding, Shares);

  const worthPost = makeRatioFromAmounts(balancePost, outstandingPost);
  return harden({ shareWorth: worthPost, FromPool: payout });
};

/**
 * @param {Record<'pool' | 'lp' | 'burn', ZCFSeat>} seats
 * @param {Record<'Shares' | 'FromPool', Amount<'nat'>>} amounts
 * @returns {TransferPart[]}
 */
export const withdrawTransfers = (seats, { Shares, FromPool }) =>
  harden([
    [seats.pool, seats.lp, { Pool: FromPool }, { FromPool }],
    [seats.lp, seats.burn, { Shares }],
  ]);

/**
 * @param {ShareWorth} shareWorth
 * @param {Amount<'nat'>} fees
 */
export const withFees = (shareWorth, fees) => {
  const balancePost = add(shareWorth.numerator, fees);
  return makeRatioFromAmounts(balancePost, shareWorth.denominator);
};

/**
 * @param {Record<'fees' | 'pool', ZCFSeat>} seats
 * @param {Record<'Fees', Amount<'nat'>>} amounts
 * @returns {TransferPart[]}
 */
export const feeTransfers = (seats, { Fees }) =>
  harden([[seats.fees, seats.pool, { Fees }]]);
