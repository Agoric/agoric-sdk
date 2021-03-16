// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import '../../../exported';

import { makeIssuerKit } from '@agoric/ertp';
import {
  makePercent,
  calculatePercent,
  makeNone,
  makeAll,
} from '../../../src/contractSupport/percentMath';

test('percentMath - basic', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const halfDefault = makePercent(50n, amountMath);
  const halfPrecise = makePercent(5000n, amountMath, 10000n);

  t.deepEqual(moe(666), halfDefault.scale(moe(1333)));
  t.deepEqual(moe(6666666), halfDefault.scale(moe(13333333)));
  t.deepEqual(moe(666), halfPrecise.scale(moe(1333)));
  t.deepEqual(moe(6666666), halfPrecise.scale(moe(13333333)));
});

test('percentMath - onethird', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3), amountMath);
  const oneThirdPrecise = calculatePercent(moe(1), moe(3), amountMath, 10000);

  t.deepEqual(moe(33000), oneThirdDefault.scale(moe(100000)));
  t.deepEqual(moe(33330), oneThirdPrecise.scale(moe(100000)));
});

test('percentMath - brand mismatch', t => {
  const { amountMath } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3), amountMath);
  t.throws(
    () => calculatePercent(moe(1), amountMath, astAmountMath.make(3), 10000n),
    {
      message: `Dividing amounts of different brands doesn't produce a percent.`,
    },
  );

  t.throws(() => oneThirdDefault.scale(astAmountMath.make(100000)), {
    message: `amountMath must have the same brand as amount`,
  });
});

test('percentMath - ALL', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  t.deepEqual(moe(100000), makeAll(amountMath).scale(moe(100000)));
});

test('percentMath - NONE', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  t.deepEqual(amountMath.getEmpty(), makeNone(amountMath).scale(moe(100000)));
});

test('percentMath - complement', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3), amountMath);
  const twoThirdsDefault = oneThirdDefault.complement();
  const oneThirdPrecise = calculatePercent(moe(1), moe(3), amountMath, 10000n);
  const twoThirdsPrecise = oneThirdPrecise.complement();

  t.deepEqual(moe(33000), oneThirdDefault.scale(moe(100000)));
  t.deepEqual(moe(67000), twoThirdsDefault.scale(moe(100000)));
  t.deepEqual(moe(66670), twoThirdsPrecise.scale(moe(100000)));
});

test('percentMath - non-standard thirds', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdDefault = calculatePercent(moe(1), moe(3), amountMath);
  const oneThirdBetter = calculatePercent(moe(1), moe(3), amountMath, 1000n);
  const oneThirdPrecise = makePercent(1n, amountMath, 3n);

  t.deepEqual(moe(2970), oneThirdDefault.scale(moe(9000)));
  t.deepEqual(moe(2997), oneThirdBetter.scale(moe(9000)));
  t.deepEqual(moe(3000), oneThirdPrecise.scale(moe(9000)));
});

test('percentMath - larger than 100%', t => {
  const { amountMath } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneFiftyDefault = calculatePercent(moe(5), moe(3), amountMath);
  const oneFiftyBetter = calculatePercent(moe(5), moe(3), amountMath, 1000n);

  // 1.66 * 7777
  t.deepEqual(moe(12909), oneFiftyDefault.scale(moe(7777)));
  // 1.666 * 7777
  t.deepEqual(moe(12956), oneFiftyBetter.scale(moe(7777)));
});

test('percentMath - Nats only', t => {
  const { amountMath } = makeIssuerKit('moe');

  t.throws(() => makePercent(10.1, amountMath), {
    message: '10.1 not a safe integer',
  });

  t.notThrows(() => makePercent(47n, amountMath));
});
