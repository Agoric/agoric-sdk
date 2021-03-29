// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';
import buildManualTimer from '../../tools/manualTimer';

import { setup } from './setupBasicMints';
import { makeFakePriceAuthority } from '../../tools/fakePriceAuthority';
import {
  getAmountOut,
  getTimestamp,
  getAmountIn,
  getQuoteValues,
} from '../../src/contractSupport';
import { assertAmountsEqual } from '../zoeTestHelpers';

const makeTestPriceAuthority = (brands, priceList, timer) =>
  makeFakePriceAuthority({
    actualBrandIn: brands.get('moola'),
    actualBrandOut: brands.get('bucks'),
    priceList,
    timer,
  });

test('priceAuthority quoteAtTime', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');
  assert(bucksBrand);
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  const done = E(priceAuthority)
    .quoteAtTime(3n, moola(5), bucksBrand)
    .then(async quote => {
      assertAmountsEqual(t, moola(5), getAmountIn(quote));
      assertAmountsEqual(t, bucks(55 * 5), getAmountOut(quote));
      t.is(3n, getTimestamp(quote));
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await done;
});

test('priceAuthority quoteGiven', async t => {
  const { moola, brands, bucks } = setup();
  const bucksBrand = brands.get('bucks');
  assert(bucksBrand);
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteGiven(moola(37), bucksBrand);
  const quoteAmount = getQuoteValues(quote);
  t.is(1n, quoteAmount.timestamp);
  t.deepEqual(bucks(37 * 20), quoteAmount.amountOut);
});

test('priceAuthority quoteWanted', async t => {
  const { moola, bucks, brands } = setup();
  const moolaBrand = brands.get('moola');
  assert(moolaBrand);
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400));
  const quoteAmount = quote.quoteAmount.value[0];
  t.is(1n, quoteAmount.timestamp);
  assertAmountsEqual(t, bucks(400), quoteAmount.amountOut);
  assertAmountsEqual(t, moola(20), quoteAmount.amountIn);
});

test('priceAuthority paired quotes', async t => {
  const { moola, bucks, brands } = setup();
  const moolaBrand = brands.get('moola');
  assert(moolaBrand);
  const bucksBrand = brands.get('bucks');
  assert(bucksBrand);
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();

  const quoteOut = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400));
  const quoteOutAmount = quoteOut.quoteAmount.value[0];
  t.is(1n, quoteOutAmount.timestamp);
  assertAmountsEqual(t, bucks(400), quoteOutAmount.amountOut);
  assertAmountsEqual(t, moola(20), quoteOutAmount.amountIn);

  const quoteIn = await E(priceAuthority).quoteGiven(moola(22), bucksBrand);
  const quoteInAmount = quoteIn.quoteAmount.value[0];
  t.is(1n, quoteInAmount.timestamp);
  assertAmountsEqual(t, bucks(20 * 22), quoteInAmount.amountOut);
  assertAmountsEqual(t, moola(22), quoteInAmount.amountIn);
});

test('priceAuthority quoteWhenGTE', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 30, 25, 40],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGTE(moola(1), bucks(40))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4n, manualTimer.getCurrentTimestamp());
      t.is(4n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(40), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLT', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 30, 29],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLT(moola(1), bucks(30))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3n, manualTimer.getCurrentTimestamp());
      t.is(3n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(29), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenGT', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 30, 41],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGT(moola(1), bucks(40))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3n, manualTimer.getCurrentTimestamp());
      t.is(3n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(41), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLTE', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(console.log, 0n);
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 26, 50, 25],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLTE(moola(1), bucks(25))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4n, quoteInAmount.timestamp);
      t.is(4n, manualTimer.getCurrentTimestamp());
      assertAmountsEqual(t, bucks(25), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});
