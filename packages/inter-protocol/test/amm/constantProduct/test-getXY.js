// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { getXY } from '../../../src/vpool-xyk-amm/constantProduct/getXY.js';
import { setupMintKits } from './setupMints.js';

test('swap Central for Secondary', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = run(2000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = bld(2819n);
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Central);
  t.deepEqual(y, poolAllocation.Secondary);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});

test('swap Central for Secondary no Give', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = undefined;
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = bld(2819n);
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Central);
  t.deepEqual(y, poolAllocation.Secondary);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});

test('swap Central for Secondary no want', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = run(3000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = undefined;
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Central);
  t.deepEqual(y, poolAllocation.Secondary);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});

test('swap Secondary for Central', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = bld(2000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = run(2819n);
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Secondary);
  t.deepEqual(y, poolAllocation.Central);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});

test('swap Secondary for Central no want', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = bld(2000n);
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = undefined;
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Secondary);
  t.deepEqual(y, poolAllocation.Central);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});

test('swap Secondary for Central no give', t => {
  const { run, bld } = setupMintKits();

  const amountGiven = undefined;
  const poolAllocation = {
    Central: run(102902920n),
    Secondary: bld(203838393n),
  };
  const amountWanted = run(9342193n);
  const { x, y, deltaX, deltaY } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });

  t.deepEqual(x, poolAllocation.Secondary);
  t.deepEqual(y, poolAllocation.Central);
  t.deepEqual(deltaX, amountGiven);
  t.deepEqual(deltaY, amountWanted);
});
