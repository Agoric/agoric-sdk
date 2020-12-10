// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';
import '../../../src/contractSupport/types';

import { makeIssuerKit } from '@agoric/ertp';
import {
  makePercent,
  calculatePercent,
  ALL,
  NONE,
} from '../../../src/contractSupport/percentMath';

test('percentMath - basic', t => {
  const halfDefault = makePercent(50);
  const halfPrecise = makePercent(5000, 10000);

  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  t.deepEqual(moe(666), halfDefault.scale(amountMath, moe(1333)));
  t.deepEqual(moe(6666666), halfDefault.scale(amountMath, moe(13333333)));
  t.deepEqual(moe(666), halfPrecise.scale(amountMath, moe(1333)));
  t.deepEqual(moe(6666666), halfPrecise.scale(amountMath, moe(13333333)));
});

test('percentMath - onethird', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3));
  const oneThirdPrecise = calculatePercent(moe(1), moe(3), 10000);

  t.deepEqual(moe(33000), oneThirdDefault.scale(amountMath, moe(100000)));
  t.deepEqual(moe(33330), oneThirdPrecise.scale(amountMath, moe(100000)));
});

test('percentMath - brand mismatch', t => {
  const { amountMath } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3));
  t.throws(() => calculatePercent(moe(1), astAmountMath.make(3), 10000), {
    message: `use calculatePercentAmounts() when brands don't match`,
  });

  t.throws(() => oneThirdDefault.scale(astAmountMath, moe(100000)), {
    message: `amountMath must have the same brand as amount`,
  });
});

test('percentMath - ALL', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  t.deepEqual(moe(100000), ALL.scale(amountMath, moe(100000)));
});

test('percentMath - NONE', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  t.deepEqual(amountMath.getEmpty(), NONE.scale(amountMath, moe(100000)));
});

test('percentMath - inverse', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3));
  const twoThirdsDefault = oneThirdDefault.inverse();
  const oneThirdPrecise = calculatePercent(moe(1), moe(3), 10000);
  const twoThirdsPrecise = oneThirdPrecise.inverse();

  t.deepEqual(moe(33000), oneThirdDefault.scale(amountMath, moe(100000)));
  t.deepEqual(moe(67000), twoThirdsDefault.scale(amountMath, moe(100000)));
  t.deepEqual(moe(66670), twoThirdsPrecise.scale(amountMath, moe(100000)));
});

test('percentMath - non-standard thirds', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3));
  const oneThirdBetter = calculatePercent(moe(1), moe(3), 1000);
  const oneThirdPrecise = makePercent(1, 3);

  t.deepEqual(moe(2970), oneThirdDefault.scale(amountMath, moe(9000)));
  t.deepEqual(moe(2997), oneThirdBetter.scale(amountMath, moe(9000)));
  t.deepEqual(moe(3000), oneThirdPrecise.scale(amountMath, moe(9000)));
});
