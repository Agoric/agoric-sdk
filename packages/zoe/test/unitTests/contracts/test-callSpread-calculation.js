// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '../../../exported.js';

import { setup } from '../setupBasicMints.js';
import { calculateShares } from '../../../src/contracts/callSpread/calculateShares.js';
import {
  ceilMultiplyBy,
  floorMultiplyBy,
} from '../../../src/contractSupport/index.js';
import {
  make0Percent,
  make100Percent,
} from '../../../src/contracts/callSpread/percent.js';

function compareShareRatios(t, actual, expected, amount) {
  t.deepEqual(
    ceilMultiplyBy(amount, actual.longShare),
    ceilMultiplyBy(amount, expected.longShare),
  );
  t.deepEqual(
    floorMultiplyBy(amount, actual.shortShare),
    floorMultiplyBy(amount, expected.shortShare),
  );
}

test('callSpread-calculation, at lower bound', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(20);
  const strike2 = moola(70);
  const price = moola(20);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000),
  );
});

test('callSpread-calculation, at upper bound', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(20);
  const strike2 = moola(55);
  const price = moola(55);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000),
  );
});

test('callSpread-calculation, below lower bound', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(55);
  const price = moola(0n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000),
  );
});

test('callSpread-calculation, above upper bound', async t => {
  const { moola, bucks, brands } = setup();

  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(55);
  const price = moola(60);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000),
  );
});

test('callSpread-calculation, mid-way', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(40);
  const { longShare, shortShare } = calculateShares(
    bucksBrand,
    price,
    strike1,
    strike2,
  );
  t.deepEqual(ceilMultiplyBy(bucks(1000), longShare), bucks(834));
  t.deepEqual(floorMultiplyBy(bucks(1000), shortShare), bucks(166));
});

test('callSpread-calculation, zero', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(0n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000),
  );
});

test('callSpread-calculation, large', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(10000000000);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000),
  );
});
