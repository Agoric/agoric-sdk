import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

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

  const strike1 = moola(20n);
  const strike2 = moola(70n);
  const price = moola(20n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000n),
  );
});

test('callSpread-calculation, at upper bound', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(20n);
  const strike2 = moola(55n);
  const price = moola(55n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000n),
  );
});

test('callSpread-calculation, below lower bound', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15n);
  const strike2 = moola(55n);
  const price = moola(0n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000n),
  );
});

test('callSpread-calculation, above upper bound', async t => {
  const { moola, bucks, brands } = setup();

  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15n);
  const strike2 = moola(55n);
  const price = moola(60n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000n),
  );
});

test('callSpread-calculation, mid-way', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15n);
  const strike2 = moola(45n);
  const price = moola(40n);
  const { longShare, shortShare } = calculateShares(
    bucksBrand,
    price,
    strike1,
    strike2,
  );
  t.deepEqual(ceilMultiplyBy(bucks(1000n), longShare), bucks(834n));
  t.deepEqual(floorMultiplyBy(bucks(1000n), shortShare), bucks(166n));
});

test('callSpread-calculation, zero', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15n);
  const strike2 = moola(45n);
  const price = moola(0n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make0Percent(bucksBrand),
      shortShare: make100Percent(bucksBrand),
    },
    bucks(1000n),
  );
});

test('callSpread-calculation, large', async t => {
  const { moola, bucks, brands } = setup();
  const bucksBrand = brands.get('bucks');

  const strike1 = moola(15n);
  const strike2 = moola(45n);
  const price = moola(10000000000n);
  compareShareRatios(
    t,
    calculateShares(bucksBrand, price, strike1, strike2),
    {
      longShare: make100Percent(bucksBrand),
      shortShare: make0Percent(bucksBrand),
    },
    bucks(1000n),
  );
});
