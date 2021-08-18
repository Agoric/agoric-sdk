// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { getXY } from '../../../../src/contracts/constantProduct/getXY';
import { setupMintKits } from './setupMints';

// There's no difference between SwapIn and SwapOut for this function
test('swap Central for Secondary', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = run(2000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = bld(2819n);
  const { x, y, deltaX, wantedDeltaY } = getXY(
    amountGiven,
    poolAllocation,
    amountWanted,
  );

  t.deepEqual(x, poolAllocation.Central);
  t.deepEqual(y, poolAllocation.Secondary);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(wantedDeltaY, amountWanted);
});

test('swap Secondary for Central', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = bld(2000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = run(2819n);
  const { x, y, deltaX, wantedDeltaY } = getXY(
    amountGiven,
    poolAllocation,
    amountWanted,
  );

  t.deepEqual(x, poolAllocation.Secondary);
  t.deepEqual(y, poolAllocation.Central);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(wantedDeltaY, amountWanted);
});
