// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import '../../../exported';

import { setup } from '../setupBasicMints';
import { calculateShares } from '../../../src/contracts/callSpread/calculateShares';
import { multiplyBy } from '../../../src/contractSupport';
import {
  make0Percent,
  make100Percent,
} from '../../../src/contracts/callSpread/percent';

function compareShareRatios(t, expected, actual, amount) {
  t.deepEqual(
    multiplyBy(amount, expected.longShare),
    multiplyBy(amount, actual.longShare),
  );
  t.deepEqual(
    multiplyBy(amount, expected.shortShare),
    multiplyBy(amount, actual.shortShare),
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
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
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
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
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
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
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
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
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
  t.deepEqual(bucks(833), multiplyBy(bucks(1000), longShare));
  t.deepEqual(bucks(166), multiplyBy(bucks(1000), shortShare));
});

test('callSpread-calculation, zero', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(0n);
  compareShareRatios(
    t,
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
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
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    calculateShares(bucksBrand, price, strike1, strike2),
    bucks(1000),
  );
});
