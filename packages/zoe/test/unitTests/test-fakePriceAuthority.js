// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { assert } from '@agoric/assert';
import { TimeMath } from '@agoric/swingset-vat/src/vats/timer/timeMath.js';
import buildManualTimer from '../../tools/manualTimer.js';

import { setup } from './setupBasicMints.js';
import { makeFakePriceAuthority } from '../../tools/fakePriceAuthority.js';
import { eventLoopIteration } from '../../tools/eventLoopIteration.js';
import {
  getAmountOut,
  getTimestamp,
  getAmountIn,
  getPriceDescription,
} from '../../src/contractSupport/index.js';
import { assertAmountsEqual } from '../zoeTestHelpers.js';

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
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  const done = E(priceAuthority)
    .quoteAtTime(2n, moola(5n), bucksBrand)
    .then(async quote => {
      assertAmountsEqual(t, moola(5n), getAmountIn(quote));
      assertAmountsEqual(t, bucks(55n * 5n), getAmountOut(quote));
      t.is(2n, TimeMath.absValue(getTimestamp(quote)));
    });

  await E(manualTimer).tick(); // t 0->1, idx 0->0, p 20->55
  await E(manualTimer).tick(); // t 1->2, idx 0->1, p 55->20
  await E(manualTimer).tick(); // t 2->3, idx 1->2, p 20->55 : fires
  await E(manualTimer).tick(); // t 3->4, idx 2->3, p 55->20 : extra
  await done;
});

test('priceAuthority quoteGiven', async t => {
  const { moola, brands, bucks } = setup();
  const bucksBrand = brands.get('bucks');
  assert(bucksBrand);
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteGiven(moola(37n), bucksBrand);
  const quoteAmount = getPriceDescription(quote);
  t.is(1n, TimeMath.absValue(quoteAmount.timestamp));
  t.deepEqual(bucks(37n * 20n), quoteAmount.amountOut);
});

test('priceAuthority quoteWanted', async t => {
  const { moola, bucks, brands } = setup();
  const moolaBrand = brands.get('moola');
  assert(moolaBrand);
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400n));
  const quoteAmount = quote.quoteAmount.value[0];
  t.is(1n, quoteAmount.timestamp);
  assertAmountsEqual(t, bucks(400n), quoteAmount.amountOut);
  assertAmountsEqual(t, moola(20n), quoteAmount.amountIn);
});

test('priceAuthority paired quotes', async t => {
  const { moola, bucks, brands } = setup();
  const moolaBrand = brands.get('moola');
  assert(moolaBrand);
  const bucksBrand = brands.get('bucks');
  assert(bucksBrand);
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();

  const quoteOut = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400n));
  const quoteOutAmount = quoteOut.quoteAmount.value[0];
  t.is(1n, quoteOutAmount.timestamp);
  assertAmountsEqual(t, bucks(400n), quoteOutAmount.amountOut);
  assertAmountsEqual(t, moola(20n), quoteOutAmount.amountIn);

  const quoteIn = await E(priceAuthority).quoteGiven(moola(22n), bucksBrand);
  const quoteInAmount = quoteIn.quoteAmount.value[0];
  t.is(1n, quoteInAmount.timestamp);
  assertAmountsEqual(t, bucks(20n * 22n), quoteInAmount.amountOut);
  assertAmountsEqual(t, moola(22n), quoteInAmount.amountIn);
});

test('priceAuthority quoteWhenGTE', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [20, 30, 25, 40],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGTE(moola(1n), bucks(40n))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4n, manualTimer.getCurrentTimestamp());
      t.is(4n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(40n), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1n), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLT', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 30, 29],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLT(moola(1n), bucks(30n))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3n, manualTimer.getCurrentTimestamp());
      t.is(3n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(29n), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1n), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenGT', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 30, 41],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGT(moola(1n), bucks(40n))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3n, manualTimer.getCurrentTimestamp());
      t.is(3n, quoteInAmount.timestamp);
      assertAmountsEqual(t, bucks(41n), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1n), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLTE', async t => {
  const { moola, bucks, brands } = setup();
  const manualTimer = buildManualTimer(t.log, 0n, { eventLoopIteration });
  const priceAuthority = await makeTestPriceAuthority(
    brands,
    [40, 26, 50, 25],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLTE(moola(1n), bucks(25n))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4n, quoteInAmount.timestamp);
      t.is(4n, manualTimer.getCurrentTimestamp());
      assertAmountsEqual(t, bucks(25n), quoteInAmount.amountOut);
      assertAmountsEqual(t, moola(1n), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});
