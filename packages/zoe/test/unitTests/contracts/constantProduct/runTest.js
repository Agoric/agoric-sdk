// @ts-check

import { Nat } from '@agoric/nat';

import {
  DEFAULT_POOL_FEE,
  DEFAULT_PROTOCOL_FEE,
} from '../../../../src/contracts/constantProduct/defaults';
import { specifyRunIn } from '../../../../src/contracts/constantProduct/specifyRunIn';
import { checkKInvariantSellingX } from '../../../../src/contracts/constantProduct/invariants';
import { setupMintKits } from './setupMints';

export const runTest = (
  runPoolAllocationNat,
  secondaryPoolAllocationNat,
  runValueInNat,
) => {
  const { bld, run } = setupMintKits();
  const runAmountIn = run(Nat(runValueInNat));
  const runPoolAllocation = run(Nat(runPoolAllocationNat));
  const bldPoolAllocation = bld(Nat(secondaryPoolAllocationNat));

  const result = specifyRunIn(
    runAmountIn,
    runPoolAllocation,
    bldPoolAllocation,
    DEFAULT_PROTOCOL_FEE,
    DEFAULT_POOL_FEE,
  );
  // console.log(result);

  return checkKInvariantSellingX(
    runPoolAllocation,
    bldPoolAllocation,
    result.deltaRun,
    result.deltaSecondary,
  );
};
