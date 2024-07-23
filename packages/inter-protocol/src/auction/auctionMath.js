import { AmountMath } from '@agoric/ertp';
import {
  ceilMultiplyBy,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @import {Amount} from '@agoric/ertp/src/types.js';
 */

/**
 * @param {object} p
 * @param {Amount<'nat'>} p.bidAlloc current allocation of the bidding seat
 * @param {Amount<'nat'>} p.collateralWanted want of the offer
 * @param {Amount<'nat'>} p.collateralAvailable available to auction
 * @param {Ratio} p.curAuctionPrice current auction price
 * @param {Amount<'nat'> | null} p.remainingProceedsGoal amount still needing
 *   liquidating over multiple rounds; null indicates no limit
 * @param {(...msgs: any[]) => void} [log]
 */
export const amountsToSettle = (
  {
    bidAlloc,
    collateralWanted,
    collateralAvailable,
    curAuctionPrice,
    remainingProceedsGoal,
  },
  log = () => {},
) => {
  log('amountsToSettle', {
    bidAlloc,
    collateralWanted,
    collateralAvailable,
    curAuctionPrice,
    remainingProceedsGoal,
  });
  const initialCollateralTarget = AmountMath.min(
    collateralWanted,
    collateralAvailable,
  );

  const proceedsNeeded = ceilMultiplyBy(
    initialCollateralTarget,
    curAuctionPrice,
  );
  if (AmountMath.isEmpty(proceedsNeeded)) {
    return { proceedsNeeded: null };
  }

  // proceeds cannot exceed what is needed or being offered
  const minProceedsTarget = AmountMath.min(proceedsNeeded, bidAlloc);
  // if there is a proceeds goal from the auction, lower to that
  const proceedsLimit = remainingProceedsGoal
    ? AmountMath.min(remainingProceedsGoal, minProceedsTarget)
    : minProceedsTarget;
  /**
   * Whether the volume of the transaction is limited by the proceeds
   * goal/needs/wants
   */
  const isRaiseLimited =
    remainingProceedsGoal || !AmountMath.isGTE(proceedsLimit, proceedsNeeded);

  const [proceedsTarget, collateralTarget] = isRaiseLimited
    ? [proceedsLimit, floorDivideBy(proceedsLimit, curAuctionPrice)]
    : [minProceedsTarget, initialCollateralTarget];

  return { proceedsNeeded, proceedsTarget, collateralTarget };
};
harden(amountsToSettle);
