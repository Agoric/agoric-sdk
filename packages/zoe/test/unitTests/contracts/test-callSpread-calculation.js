// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import '../../../exported';

import { setup } from '../setupBasicMints';
import { calculateShares } from '../../../src/contracts/callSpread/calculateShares';
import { makeAll, makeNone } from '../../../src/contractSupport/percentMath';

function compareSharePercents(t, expected, actual, amount) {
  t.deepEqual(expected.longShare.scale(amount), actual.longShare.scale(amount));
  t.deepEqual(
    expected.shortShare.scale(amount),
    actual.shortShare.scale(amount),
  );
}

test('callSpread-calculation, at lower bound', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(20);
  const strike2 = moola(70);
  const price = moola(20);
  compareSharePercents(
    t,
    { longShare: makeNone(bucksMath), shortShare: makeAll(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});

test('callSpread-calculation, at upper bound', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(20);
  const strike2 = moola(55);
  const price = moola(55);
  compareSharePercents(
    t,
    { longShare: makeAll(bucksMath), shortShare: makeNone(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});

test('callSpread-calculation, below lower bound', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(55);
  const price = moola(0);
  compareSharePercents(
    t,
    { longShare: makeNone(bucksMath), shortShare: makeAll(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});

test('callSpread-calculation, above upper bound', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(55);
  const price = moola(60);
  compareSharePercents(
    t,
    { longShare: makeAll(bucksMath), shortShare: makeNone(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});

test('callSpread-calculation, mid-way', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(40);
  const { longShare, shortShare } = calculateShares(
    moolaMath,
    bucksMath,
    price,
    strike1,
    strike2,
  );
  t.deepEqual(bucks(833), longShare.scale(bucks(1000)));
  t.deepEqual(bucks(166), shortShare.scale(bucks(1000)));
});

test('callSpread-calculation, zero', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(0);
  compareSharePercents(
    t,
    { longShare: makeNone(bucksMath), shortShare: makeAll(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});

test('callSpread-calculation, large', async t => {
  const { moola, amountMaths, bucks } = setup();
  const moolaMath = amountMaths.get('moola');
  const bucksMath = amountMaths.get('bucks');

  const strike1 = moola(15);
  const strike2 = moola(45);
  const price = moola(10000000000);
  compareSharePercents(
    t,
    { longShare: makeAll(bucksMath), shortShare: makeNone(bucksMath) },
    calculateShares(moolaMath, bucksMath, price, strike1, strike2),
    bucks(1000),
  );
});
