// @ts-check

// isolated unit test of price calculations in pool in multipoolAutoswap

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { MathKind } from '@agoric/ertp';
import { setupZCFTest } from '../zcf/setupZcfTest';

import { setup } from '../setupBasicMints';
import { makeAddPool } from '../../../src/contracts/multipoolAutoswap/pool';
import { outputFromInputPrice, priceFromTargetOutput } from '../../autoswapJig';
import { depositToSeat } from '../../../src/contractSupport';
import buildManualTimer from '../../../tools/manualTimer';

async function setupPool(poolBalances) {
  const {
    bucksIssuer,
    bucks,
    moolaIssuer,
    moola,
    brands,
    moolaMint,
    bucksMint,
  } = setup();
  const centralBrand = brands.get('bucks');
  const secondaryBrand = brands.get('moola');

  const issuerKeywordRecord = harden({
    Central: bucksIssuer,
    Secondary: moolaIssuer,
  });
  const { zcf } = await setupZCFTest(issuerKeywordRecord);
  let poolInitialized = false;
  let pool;
  const initPool = (_, newPool) => {
    poolInitialized = true;
    pool = newPool;
  };
  const isSecondary = b => poolInitialized && b === secondaryBrand;
  const timer = buildManualTimer(console.log);
  const quoteMint = await zcf.makeZCFMint('AutoswapQuotes', MathKind.SET);
  const addPool = makeAddPool(
    zcf,
    isSecondary,
    initPool,
    centralBrand,
    timer,
    quoteMint,
  );
  await addPool(moolaIssuer, 'Moola');

  const moolaAmount = moola(poolBalances.secondary);
  const bucksAmount = bucks(poolBalances.central);
  const { zcfSeat } = zcf.makeEmptySeatKit();
  await depositToSeat(
    zcf,
    zcfSeat,
    { Secondary: moolaAmount, Central: bucksAmount },
    {
      Secondary: moolaMint.mintPayment(moolaAmount),
      Central: bucksMint.mintPayment(bucksAmount),
    },
  );

  pool.addLiquidity(zcfSeat);
  return {
    pool,
    centralBrand,
    secondaryBrand,
    central: bucks,
    secondary: moola,
  };
}

test('pool getPrice centToSec', async t => {
  const allocations = { central: 100n, secondary: 100n };
  const { pool, secondaryBrand, central, secondary } = await setupPool(
    allocations,
  );
  const valueIn = 40n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenAvailableInput(
    central(valueIn),
    secondaryBrand,
  );
  const expected = outputFromInputPrice(100n, 100n, valueIn, 3n);
  t.deepEqual(amountOut, secondary(expected));
  t.deepEqual(amountIn, central(valueIn));
});

test('pool getPrice secToCent', async t => {
  const allocations = { central: 100n, secondary: 100n };
  const { pool, centralBrand, central, secondary } = await setupPool(
    allocations,
  );
  const valueIn = 40n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenAvailableInput(
    secondary(valueIn),
    centralBrand,
  );
  const expected = outputFromInputPrice(100n, 100n, valueIn, 3n);
  t.deepEqual(amountOut, central(expected));
  t.deepEqual(amountIn, secondary(valueIn));
});

test('pool getPrice secToSec', async t => {
  const allocations = { central: 100n, secondary: 100n };
  const { pool, secondaryBrand, secondary } = await setupPool(allocations);
  const valueIn = 40n;
  await t.throwsAsync(
    () =>
      E(pool).getPriceGivenAvailableInput(secondary(valueIn), secondaryBrand),
    { message: 'brands must be central and secondary' },
  );
});

test('pool getPrice amountIn != available', async t => {
  const allocations = { central: 100n, secondary: 1000n };
  const { pool, centralBrand, central, secondary } = await setupPool(
    allocations,
  );
  const valueIn = 40n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenAvailableInput(
    secondary(valueIn),
    centralBrand,
  );
  t.deepEqual(amountOut, central(3));
  // 40 would get you 3, but you can get 3 for 32 if that's better.
  t.deepEqual(amountIn, secondary(32));
});

test('pool getOutputPrice cenToSec', async t => {
  const poolBalances = { central: 100n, secondary: 100n };
  const { pool, centralBrand, central, secondary } = await setupPool(
    poolBalances,
  );
  const valueOut = 40n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenRequiredOutput(
    centralBrand,
    secondary(valueOut),
  );
  const expected = priceFromTargetOutput(valueOut, 100n, 100n, 3n);
  t.deepEqual(amountOut, secondary(valueOut));
  t.deepEqual(amountIn, central(expected));
});

test('pool getOutputPrice secToCent', async t => {
  const poolBalances = { central: 100n, secondary: 100n };
  const { pool, secondaryBrand, central, secondary } = await setupPool(
    poolBalances,
  );
  const valueOut = 40n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenRequiredOutput(
    secondaryBrand,
    central(valueOut),
  );
  const expected = priceFromTargetOutput(valueOut, 100n, 100n, 3n);
  t.deepEqual(amountOut, central(valueOut));
  t.deepEqual(amountIn, secondary(expected));
});

test('pool getOutputPrice amountOut != requested', async t => {
  const poolBalances = { central: 1000n, secondary: 100n };
  const { pool, secondaryBrand, central, secondary } = await setupPool(
    poolBalances,
  );
  const valueOut = 4n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenRequiredOutput(
    secondaryBrand,
    central(valueOut),
  );
  // central(4) requires spending secondary(1), but you can get central(9) for
  // secondary(1)
  t.deepEqual(amountOut, central(9));
  t.deepEqual(amountIn, secondary(1));
});

test('pool getOutputPrice secToSec', async t => {
  const poolBalances = { central: 100n, secondary: 100n };
  const { pool, secondaryBrand, secondary } = await setupPool(poolBalances);
  const valueOut = 40n;
  await t.throwsAsync(
    () =>
      E(pool).getPriceGivenRequiredOutput(secondaryBrand, secondary(valueOut)),
    {
      message: 'brands must be central and secondary',
    },
  );
});

test('pool getOutputPrice cenToCen', async t => {
  const poolBalances = { central: 100n, secondary: 100n };
  const { pool, centralBrand, central } = await setupPool(poolBalances);
  const valueOut = 40n;
  await t.throwsAsync(
    () => E(pool).getPriceGivenRequiredOutput(centralBrand, central(valueOut)),
    {
      message: 'brands must be central and secondary',
    },
  );
});

test('pool getPrice zero', async t => {
  const allocations = { central: 100n, secondary: 100n };
  const { pool, centralBrand, central, secondary } = await setupPool(
    allocations,
  );
  const valueIn = 0n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenAvailableInput(
    secondary(valueIn),
    centralBrand,
  );
  const expected = 0n;
  t.deepEqual(amountOut, central(expected));
  t.deepEqual(amountIn, secondary(valueIn));
});

test('pool getOutputPrice zero', async t => {
  const poolBalances = { central: 100n, secondary: 100n };
  const { pool, secondaryBrand, central, secondary } = await setupPool(
    poolBalances,
  );
  const valueOut = 0n;
  const { amountOut, amountIn } = await E(pool).getPriceGivenRequiredOutput(
    secondaryBrand,
    central(valueOut),
  );
  const expected = 0n;
  t.deepEqual(amountOut, central(valueOut));
  t.deepEqual(amountIn, secondary(expected));
});
