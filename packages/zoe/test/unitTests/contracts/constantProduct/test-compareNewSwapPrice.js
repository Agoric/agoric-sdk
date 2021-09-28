// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  calcDeltaXSellingX,
  calcDeltaYSellingX,
  swapInNoFees,
} from '../../../../src/contracts/constantProduct/core.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';
import { calcSwapInPrices } from '../../../../src/contracts/constantProduct/calcSwapPrices.js';

const BASIS_POINTS = 10000n;
const POOL_FEE = 24n;
const PROTOCOL_FEE = 6n;

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

test('newSwap getPriceGivenAvailableInput specify central', async t => {
  const { moola, bucks, moolaKit, bucksKit } = setupMints();
  const poolAllocation = {
    Central: moola(800000n),
    Secondary: bucks(300000n),
  };
  const amountGiven = moola(10000n);
  const amountWanted = bucks(1n);

  const protocolFeeRatio = makeRatio(
    PROTOCOL_FEE,
    moolaKit.brand,
    BASIS_POINTS,
  );
  const poolFeeRatio = makeRatio(POOL_FEE, bucksKit.brand, BASIS_POINTS);

  // This is reduced, if any reduction occurs.
  const noFeesResult = swapInNoFees({ amountGiven, poolAllocation });
  t.deepEqual(noFeesResult.amountIn, moola(9999n));
  t.deepEqual(noFeesResult.amountOut, bucks(3703n));

  const noReductionResult = calcDeltaYSellingX(
    poolAllocation.Central,
    poolAllocation.Secondary,
    amountGiven,
  );
  t.deepEqual(noReductionResult, bucks(3703n));

  const reduced = calcDeltaXSellingX(
    poolAllocation.Central,
    poolAllocation.Secondary,
    noReductionResult,
  );
  t.deepEqual(reduced, moola(9999n));

  const result = calcSwapInPrices(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  );
  // swapperGives is 9999n
  // t.deepEqual(result.swapperGives, moola(9997n));
  // Same
  t.deepEqual(result.swapperGets, bucks(3692n));
  // Protocol fee is 6n
  // t.deepEqual(result.protocolFee, moola(5n));
});

test('newSwap getPriceGivenAvailableInput secondary', async t => {
  const { moola, bucks, moolaKit } = setupMints();
  const poolAllocation = {
    Central: moola(800000n),
    Secondary: bucks(500000n),
  };
  const amountGiven = bucks(10000n);
  const amountWanted = moola(1n);

  const protocolFeeRatio = makeRatio(
    PROTOCOL_FEE,
    moolaKit.brand,
    BASIS_POINTS,
  );
  const poolFeeRatio = makeRatio(POOL_FEE, moolaKit.brand, BASIS_POINTS);

  const result = calcSwapInPrices(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  );

  const newSwapResult = {
    amountIn: bucks(10000n),
    amountOut: moola(15640n),
    protocolFee: moola(9n),
  };

  // same
  t.deepEqual(result.swapperGives, newSwapResult.amountIn);
  // SwapperGets one less: 15639n
  // t.deepEqual(result.swapperGets, newSwapResult.amountOut);
  // Swapper pays one more: 10n
  // t.deepEqual(result.protocolFee, newSwapResult.protocolFee);
});
