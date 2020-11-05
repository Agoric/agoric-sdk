// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '../../tools/manualTimer';

import { setup } from './setupBasicMints';
import { makeFakePriceAuthority } from '../../tools/fakePriceAuthority';

test('priceAuthority quoteAtTime', async t => {
  const { moola, bucks, amountMaths, brands } = setup();
  const bucksBrand = brands.get('bucks');
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [20, 55],
    manualTimer,
  );

  const done = E(priceAuthority)
    .quoteAtTime(3, moola(5), bucksBrand)
    .then(async quote => {
      t.deepEqual(
        moola(5),
        quote.quoteAmount.value[0].amountIn,
        'amountIn match',
      );
      t.deepEqual(bucks(55 * 5), quote.quoteAmount.value[0].amountOut);
      t.is(3, quote.quoteAmount.value[0].timestamp);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await done;
});

test('priceAuthority quoteGiven', async t => {
  const { moola, amountMaths, brands, bucks } = setup();
  const bucksBrand = brands.get('bucks');
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteGiven(moola(37), bucksBrand);
  const quoteAmount = quote.quoteAmount.value[0];
  t.is(1, quoteAmount.timestamp);
  t.deepEqual(bucks(37 * 20), quoteAmount.amountOut);
});

test('priceAuthority quoteWanted', async t => {
  const { moola, bucks, amountMaths, brands } = setup();
  const moolaBrand = brands.get('moola');
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();
  const quote = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400));
  const quoteAmount = quote.quoteAmount.value[0];
  t.is(1, quoteAmount.timestamp);
  t.deepEqual(bucks(400), quoteAmount.amountOut);
  t.deepEqual(moola(20), quoteAmount.amountIn);
});

test('priceAuthority paired quotes', async t => {
  const { moola, bucks, amountMaths, brands } = setup();
  const moolaBrand = brands.get('moola');
  const bucksBrand = brands.get('bucks');
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [20, 55],
    manualTimer,
  );

  await E(manualTimer).tick();

  const quoteOut = await E(priceAuthority).quoteWanted(moolaBrand, bucks(400));
  const quoteOutAmount = quoteOut.quoteAmount.value[0];
  t.is(1, quoteOutAmount.timestamp);
  t.deepEqual(bucks(400), quoteOutAmount.amountOut);
  t.deepEqual(moola(20), quoteOutAmount.amountIn);

  const quoteIn = await E(priceAuthority).quoteGiven(moola(22), bucksBrand);
  const quoteInAmount = quoteIn.quoteAmount.value[0];
  t.is(1, quoteInAmount.timestamp);
  t.deepEqual(bucks(20 * 22), quoteInAmount.amountOut);
  t.deepEqual(moola(22), quoteInAmount.amountIn);
});

test('priceAuthority quoteWhenGTE', async t => {
  const { moola, bucks, amountMaths } = setup();
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [20, 30, 25, 40],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGTE(moola(1), bucks(40))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4, manualTimer.getCurrentTimestamp());
      t.is(4, quoteInAmount.timestamp);
      t.deepEqual(bucks(40), quoteInAmount.amountOut);
      t.deepEqual(moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLT', async t => {
  const { moola, bucks, amountMaths } = setup();
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [40, 30, 29],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLT(moola(1), bucks(30))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3, manualTimer.getCurrentTimestamp());
      t.is(3, quoteInAmount.timestamp);
      t.deepEqual(bucks(29), quoteInAmount.amountOut);
      t.deepEqual(moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenGT', async t => {
  const { moola, bucks, amountMaths } = setup();
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [40, 30, 41],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenGT(moola(1), bucks(40))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(3, manualTimer.getCurrentTimestamp());
      t.is(3, quoteInAmount.timestamp);
      t.deepEqual(bucks(41), quoteInAmount.amountOut);
      t.deepEqual(moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});

test('priceAuthority quoteWhenLTE', async t => {
  const { moola, bucks, amountMaths } = setup();
  const manualTimer = buildManualTimer(console.log, 0);
  const priceAuthority = makeFakePriceAuthority(
    amountMaths,
    [40, 26, 50, 25],
    manualTimer,
  );

  E(priceAuthority)
    .quoteWhenLTE(moola(1), bucks(25))
    .then(quote => {
      const quoteInAmount = quote.quoteAmount.value[0];
      t.is(4, quoteInAmount.timestamp);
      t.is(4, manualTimer.getCurrentTimestamp());
      t.deepEqual(bucks(25), quoteInAmount.amountOut);
      t.deepEqual(moola(1), quoteInAmount.amountIn);
    });

  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
  await E(manualTimer).tick();
});
