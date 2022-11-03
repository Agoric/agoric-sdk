// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import {
  calcDeltaXSellingX,
  calcDeltaYSellingX,
  swapInNoFees,
} from '../../../src/vpool-xyk-amm/constantProduct/core.js';
import { pricesForStatedInput } from '../../../src/vpool-xyk-amm/constantProduct/calcSwapPrices.js';

const BASIS_POINTS = 10000n;

// Moola is central

const setupMints = () => {
  const moolaKit = makeIssuerKit('moola');
  const bucksKit = makeIssuerKit('bucks');
  const simoleanKit = makeIssuerKit('simolean');

  const moola = value => AmountMath.make(moolaKit.brand, value);
  const bucks = value => AmountMath.make(bucksKit.brand, value);
  const simoleans = value => AmountMath.make(simoleanKit.brand, value);

  return {
    moolaKit,
    bucksKit,
    simoleanKit,
    moola,
    bucks,
    simoleans,
  };
};

// This test shows an example from README.md
test('pricesForStatedInput  README example', async t => {
  const { moola, bucks, moolaKit, bucksKit } = setupMints();
  const poolAllocation = {
    Central: moola(40_000_000n),
    Secondary: bucks(3_000_000n),
  };
  const amountGiven = moola(30_000n);
  const amountWanted = bucks(2_000n);

  const protocolFeeRatio = makeRatio(5n, moolaKit.brand, BASIS_POINTS);
  const poolFeeRatio = makeRatio(25n, bucksKit.brand, BASIS_POINTS);

  // @ts-expect-error typescript doesn't like param list built by destructuring
  const noFeesResult = swapInNoFees({ amountGiven, poolAllocation });
  t.deepEqual(noFeesResult.amountIn, moola(29996n));
  t.deepEqual(noFeesResult.amountOut, bucks(2248n));

  const noReductionResult = calcDeltaYSellingX(
    poolAllocation.Central,
    poolAllocation.Secondary,
    amountGiven,
  );
  t.deepEqual(noReductionResult, bucks(2248n));

  const reduced = calcDeltaXSellingX(
    poolAllocation.Central,
    poolAllocation.Secondary,
    noReductionResult,
  );
  t.deepEqual(reduced, moola(29996n));

  const result = pricesForStatedInput(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  );
  t.deepEqual(result.swapperGives, moola(29998n));
  t.deepEqual(result.swapperGets, bucks(2241n));
  t.deepEqual(result.protocolFee, moola(15n));
  t.deepEqual(result.poolFee, bucks(6n));
});
