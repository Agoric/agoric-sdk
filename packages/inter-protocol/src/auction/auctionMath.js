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

  const proceedsExpected = ceilMultiplyBy(
    initialCollateralTarget,
    curAuctionPrice,
  );
  if (AmountMath.isEmpty(proceedsExpected)) {
    return { proceedsExpected: null };
  }

  const targetByProceeds = proceedsLimit =>
    AmountMath.min(
      collateralAvailable,
      floorDivideBy(proceedsLimit, curAuctionPrice),
    );

  const [proceedsTarget, collateralTarget] = (() => {
    // proceeds cannot exceed what is needed or being offered
    const proceedsBidded = AmountMath.min(proceedsExpected, bidAlloc);
    if (remainingProceedsGoal) {
      const goalProceeds = AmountMath.min(
        remainingProceedsGoal,
        proceedsBidded,
      );
      return [goalProceeds, targetByProceeds(goalProceeds)];
    } else if (AmountMath.isGTE(proceedsBidded, proceedsExpected)) {
      // initial collateral suffices
      return [proceedsBidded, initialCollateralTarget];
    } else {
      return [proceedsBidded, targetByProceeds(proceedsBidded)];
    }
  })();

  assert(
    AmountMath.isGTE(collateralAvailable, collateralTarget),
    'target cannot exceed available',
  );

  return { proceedsExpected, proceedsTarget, collateralTarget };
};
harden(amountsToSettle);
