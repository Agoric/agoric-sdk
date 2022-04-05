// @ts-check
// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { partitionProceeds } from '../../src/vaultFactory/liquidation.js';

export const mockBrand = Far('brand');

const amount = n => AmountMath.make(mockBrand, BigInt(n));

for (const [
  proceeds,
  debt,
  penaltyPortion,
  debtPaid,
  penaltyProceeds,
  runToBurn,
] of [
  // no proceeds
  [0, 0, 0, 0, 0, 0],
  [0, 100, 10, 0, 0, 0],
  //   proceeds gte debt
  [100, 100, 10, 100, 10, 90],
  [200, 100, 10, 100, 10, 90],
  //   proceeds less than debt
  [100, 200, 10, 100, 10, 90],
  [100, 200, 200, 100, 100, 0],
]) {
  test(`partitionProceeds: (${proceeds} for ${debt} with ${penaltyPortion} penalty) => ${{
    debtPaid,
    penaltyProceeds,
    runToBurn,
  }}`, t => {
    const result = partitionProceeds(
      amount(proceeds),
      amount(debt),
      amount(penaltyPortion),
    );
    t.deepEqual(result, {
      debtPaid: amount(debtPaid),
      penaltyProceeds: amount(penaltyProceeds),
      runToBurn: amount(runToBurn),
    });
  });
}
