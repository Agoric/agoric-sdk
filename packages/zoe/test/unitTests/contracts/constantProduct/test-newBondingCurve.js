// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { amountMath } from '@agoric/ertp';

import { assertAmountsEqual } from '../../../zoeTestHelpers';
import { getCurrentPrice } from '../fixedNewSwap';

import {
  DEFAULT_POOL_FEE,
  DEFAULT_PROTOCOL_FEE,
} from '../../../../src/contracts/constantProduct/defaults';
import { specifyRunIn } from '../../../../src/contracts/constantProduct/specifyRunIn';
import {
  assertKInvariantSellingX,
  assertPoolFee,
  assertProtocolFee,
} from '../../../../src/contracts/constantProduct/invariants';
import { calcDeltaYSellingX } from '../../../../src/contracts/constantProduct/core';
import { setupMintKits } from './setupMints';

const conductTestSpecifyRunIn = (
  mintKits,
  runPoolAllocationValue,
  bldPoolAllocationValue,
  runValueIn,
  expected,
  t,
  protocolFeeBP = DEFAULT_PROTOCOL_FEE,
  poolFeeBP = DEFAULT_POOL_FEE,
) => {
  const { runKit, bldKit } = mintKits;

  const bldPoolAllocation = amountMath.make(
    bldKit.brand,
    bldPoolAllocationValue,
  );
  const runPoolAllocation = amountMath.make(
    runKit.brand,
    runPoolAllocationValue,
  );

  const runAmountIn = amountMath.make(runKit.brand, runValueIn);

  const result = specifyRunIn(
    runAmountIn,
    runPoolAllocation,
    bldPoolAllocation,
    protocolFeeBP,
    poolFeeBP,
  );

  Object.entries(expected).forEach(([property, amount]) => {
    assertAmountsEqual(t, result[property], amount, property);
  });
};

test('test bug scenario', async t => {
  const mintKits = setupMintKits();
  const { run, bld } = mintKits;
  const bldPoolAllocationValue = 2196247730468n;
  const runPoolAllocationValue = 50825056949339n;
  const runValueIn = 73000000n;

  const expected = {
    protocolFee: run(43800n),
    poolFee: bld(7571n),
    amountIn: run(72999997n), // buggy newswap quotes 72999951n
    amountOut: bld(3145001n), // buggy newswap quotes 3145005n
    deltaRun: run(72956197n),
    deltaSecondary: bld(3152572n),
    newRunPool: run(50825129905536n),
    newSecondaryPool: bld(2196244577896n),
    inReturnedToUser: run(3n),
  };

  conductTestSpecifyRunIn(
    mintKits,
    runPoolAllocationValue,
    bldPoolAllocationValue,
    runValueIn,
    expected,
    t,
  );
});

test('test small values', async t => {
  const mintKits = setupMintKits();
  const { run, bld } = mintKits;
  const bldPoolAllocationValue = 40000n;
  const runPoolAllocationValue = 500000n;
  const runValueIn = 5839n;

  const expected = {
    protocolFee: run(4n),
    poolFee: bld(2n),
    amountIn: run(5834n),
    amountOut: bld(459n),
    deltaRun: run(5830n),
    deltaSecondary: bld(461n),
    newRunPool: run(505830n),
    newSecondaryPool: bld(39539n),
    inReturnedToUser: run(5n),
  };

  conductTestSpecifyRunIn(
    mintKits,
    runPoolAllocationValue,
    bldPoolAllocationValue,
    runValueIn,
    expected,
    t,
  );
});

test.failing('test bug scenario against fixed newSwap', async t => {
  const mintKits = setupMintKits();
  const { run, bld } = mintKits;
  const bldPoolAllocationValue = 2196247730468n;
  const runPoolAllocationValue = 50825056949339n;
  const runValueIn = 73000000n;

  // const expected = {
  //   protocolFee: run(43800n),
  //   poolFee: bld(7567n), // 7566
  //   amountIn: run(72999997n), // buggy newswap quotes 72999951n
  //   amountOut: bld(3145005n), // buggy newswap quotes 3145005n - the same
  //   deltaRun: run(72956197n),
  //   deltaSecondary: bld(3152572n),
  //   newRunPool: run(50825129905536n),
  //   newSecondaryPool: bld(2196244577896n),
  //   inReturnedToUser: run(3n),
  // };

  const { amountIn, amountOut, protocolFee } = getCurrentPrice(
    run(runPoolAllocationValue),
    bld(bldPoolAllocationValue),
    run(runValueIn),
    DEFAULT_PROTOCOL_FEE,
    DEFAULT_POOL_FEE,
  );

  // amountIn: run(72999997n) - amountIn is the same
  // amountOut: bld(3145007n) - amount out is higher
  // protocolFee: run(43773n) - protocolFee is less

  const runPoolAllocation = run(runPoolAllocationValue);
  const bldPoolAllocation = bld(bldPoolAllocationValue);
  const deltaX = amountMath.subtract(amountIn, protocolFee);

  // This includes the pool fee so it's only checking that including
  // the pool fee, k is increasing.
  assertKInvariantSellingX(
    run(runPoolAllocationValue),
    bld(bldPoolAllocationValue),
    amountMath.subtract(amountIn, protocolFee),
    amountOut,
  );

  const deltaY = calcDeltaYSellingX(
    runPoolAllocation,
    bldPoolAllocation,
    deltaX,
  );

  const poolFee = amountMath.subtract(deltaY, amountOut);

  // This is violated: 5.996 BP not 6
  t.notThrows(() =>
    assertProtocolFee(protocolFee, amountIn, DEFAULT_PROTOCOL_FEE),
  );

  // This is violated 23.999444263463527 not 24
  t.notThrows(() => assertPoolFee(poolFee, amountOut, DEFAULT_POOL_FEE));
});
