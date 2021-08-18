// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { swapIn } from '../../../../src/contracts/constantProduct/swapIn';
import {
  calcDeltaXSellingX,
  calcDeltaYSellingX,
  swapInNoFees,
} from '../../../../src/contracts/constantProduct/core';
import { makeRatio } from '../../../../src/contractSupport';

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

function protocolFee(input) {
  return floorDivide(multiply(input, 6n), BASIS_POINTS);
}

const doTest = () => {};

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

  const result = swapIn(
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
  const { moola, bucks, moolaKit, bucksKit } = setupMints();
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
  const poolFeeRatio = makeRatio(POOL_FEE, bucksKit.brand, BASIS_POINTS);

  const result = swapIn(
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

test('newSwap getPriceGivenRequiredOutput specify central', async t => {
  const initMoola = 700000n;
  const initBucks = 500000n;
  const { bucks, moola, bucksBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 10000n;
  const pFeePre = protocolFee(output);
  const poolChange = output + pFeePre;
  const valueIn = priceFromTargetOutput(poolChange, initMoola, initBucks, 24n);
  const valueOut = outputFromInputPrice(initBucks, initMoola, valueIn, 24n);
  const pFee = protocolFee(valueOut);
  t.deepEqual(pricer.getPriceGivenRequiredOutput(bucksBrand, moola(output)), {
    amountIn: bucks(valueIn),
    amountOut: moola(valueOut - pFee),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenRequiredOutput specify secondary', async t => {
  const initMoola = 700000n;
  const initBucks = 500000n;
  const { bucks, moola, moolaBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 10000n;
  const valueIn = priceFromTargetOutput(output, initBucks, initMoola, 24n);
  const valueOut = outputFromInputPrice(initMoola, initBucks, valueIn, 24n);
  const pFee = protocolFee(valueIn);
  t.deepEqual(pricer.getPriceGivenRequiredOutput(moolaBrand, bucks(output)), {
    amountIn: moola(valueIn + pFee),
    amountOut: bucks(valueOut),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenAvailableInput twoPools', async t => {
  const initMoola = 800000n;
  const initBucks = 500000n;
  const initSimoleans = 300000n;
  const { bucks, moola, simoleans, simoleansBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
    initSimoleans,
  );

  // get price given input from simoleans to bucks through moola, presuming
  // there will be no price improvement
  const input = 10000n;
  const moolaOut = outputFromInputPrice(initBucks, initMoola, input, 12n);
  const feeOut = floorDivide(multiply(moolaOut, 6), BASIS_POINTS);
  const simOut = outputFromInputPrice(
    initMoola,
    initSimoleans,
    moolaOut - feeOut,
    12n,
  );
  t.deepEqual(
    pricer.getPriceGivenAvailableInput(bucks(input), simoleansBrand),
    {
      amountIn: bucks(input),
      amountOut: simoleans(simOut),
      protocolFee: moola(feeOut),
      centralAmount: moola(moolaOut),
    },
  );
});

test('newSwap getPriceGivenRequiredOutput twoPools', async t => {
  const initMoola = 800000n;
  const initBucks = 500000n;
  const initSimoleans = 300000n;
  const { bucks, moola, simoleans, simoleansBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
    initSimoleans,
  );

  // get price given desired output from simoleans to bucks through moola,
  // choosing 10001 so there will be no price improvement
  const output = 10001n;
  const moolaIn = priceFromTargetOutput(output, initBucks, initMoola, 12n);
  const fee = floorDivide(multiply(moolaIn, 6), BASIS_POINTS);
  const simIn = priceFromTargetOutput(
    moolaIn + fee,
    initMoola,
    initSimoleans,
    12n,
  );
  t.deepEqual(
    pricer.getPriceGivenRequiredOutput(simoleansBrand, bucks(output)),
    {
      amountIn: simoleans(simIn),
      amountOut: bucks(output),
      protocolFee: moola(fee),
      centralAmount: moola(moolaIn),
    },
  );
});

test('newSwap getPriceGivenOutput central extreme', async t => {
  const initMoola = 700000n;
  const initBucks = 500000n;
  const { bucks, moola, bucksBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 690000n;
  const pFeePre = protocolFee(output);
  const poolChange = output + pFeePre;
  const valueIn = priceFromTargetOutput(poolChange, initMoola, initBucks, 24n);
  const valueOut = outputFromInputPrice(initBucks, initMoola, valueIn, 24n);
  const pFee = protocolFee(valueOut);
  t.deepEqual(pricer.getPriceGivenRequiredOutput(bucksBrand, moola(output)), {
    amountIn: bucks(valueIn),
    amountOut: moola(valueOut - pFee),
    protocolFee: moola(pFee),
  });

  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenInput secondary extreme', async t => {
  const moolaPool = 800000n;
  const bucksPool = 500000n;
  const { bucks, moola, moolaBrand, pricer } = setupPricer(
    moolaPool,
    bucksPool,
  );

  const input = 690000n;
  const valueOut = outputFromInputPrice(bucksPool, moolaPool, input, 24n);
  const pFee = protocolFee(valueOut);
  const valueIn = priceFromTargetOutput(valueOut, moolaPool, bucksPool, 24n);
  t.deepEqual(pricer.getPriceGivenAvailableInput(bucks(input), moolaBrand), {
    amountIn: bucks(valueIn),
    amountOut: moola(valueOut - pFee),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (moolaPool - valueOut) * (bucksPool + valueIn) > bucksPool * moolaPool,
  );
});
