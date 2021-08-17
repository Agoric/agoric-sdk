// @ts-check

import { assertRightsConserved } from '../../contractFacet/rightsConservation';

import {
  assertKInvariantSellingX,
  assertPoolFee,
  assertProtocolFee,
} from './invariants';

export const checkAllInvariants = (
  runPoolAllocation,
  secondaryPoolAllocation,
  runAmountIn,
  protocolFeeBP,
  poolFeeBP,
  result,
) => {
  // double check invariants
  assertKInvariantSellingX(
    runPoolAllocation,
    secondaryPoolAllocation,
    result.deltaRun,
    result.deltaSecondary,
  );

  const priorAmounts = [
    runPoolAllocation,
    secondaryPoolAllocation,
    runAmountIn,
  ];
  const newAmounts = [
    result.newRunPool,
    result.protocolFee,
    result.newSecondaryPool,
    result.amountOut,
    result.poolFee,
    result.inReturnedToUser,
  ];

  assertRightsConserved(priorAmounts, newAmounts);
  assertProtocolFee(result.protocolFee, result.amountIn, protocolFeeBP);
  assertPoolFee(result.poolFee, result.amountOut, poolFeeBP);
};
