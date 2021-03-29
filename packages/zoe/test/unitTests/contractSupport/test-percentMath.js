// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import '../../../exported';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import {
  makePercent,
  calculatePercent,
  makeNone,
  makeAll,
} from '../../../src/contractSupport/percentMath';
import { assertAmountsEqual } from '../../zoeTestHelpers';

test('percentMath - basic', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const halfDefault = makePercent(50n, brand);
  const halfPrecise = makePercent(5000n, brand, 10000n);

  t.deepEqual(moe(666n), halfDefault.scale(moe(1333n)));
  t.deepEqual(moe(666666n), halfDefault.scale(moe(1333333n)));
  t.deepEqual(moe(666n), halfPrecise.scale(moe(1333n)));
  t.deepEqual(moe(6666666n), halfPrecise.scale(moe(13333333n)));
});

test('percentMath - onethird', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const oneThirdDefault = calculatePercent(moe(1n), moe(3n));
  const oneThirdPrecise = calculatePercent(moe(1n), moe(3n), 10000n);

  t.deepEqual(moe(33000n), oneThirdDefault.scale(moe(100000n)));
  t.deepEqual(moe(33330n), oneThirdPrecise.scale(moe(100000n)));
});

test('percentMath - brand mismatch', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const { brand: astBrand } = makeIssuerKit('ast');

  const oneThirdDefault = calculatePercent(moe(1n), moe(3n));
  t.throws(
    () => calculatePercent(moe(1n), amountMath.make(3n, astBrand), 10000n),
    {
      message: `Dividing amounts of different brands doesn't produce a percent.`,
    },
  );

  t.throws(() => oneThirdDefault.scale(amountMath.make(100000n, astBrand)), {
    message: `amount must have the same brand as the percent`,
  });
});

test('percentMath - ALL', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  assertAmountsEqual(t, moe(100000n), makeAll(brand).scale(moe(100000n)));
});

test('percentMath - NONE', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  assertAmountsEqual(
    t,
    amountMath.makeEmpty(brand),
    makeNone(brand).scale(moe(100000n)),
  );
});

test('percentMath - complement', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const oneThirdDefault = calculatePercent(moe(1n), moe(3n));
  const twoThirdsDefault = oneThirdDefault.complement();
  const oneThirdPrecise = calculatePercent(moe(1n), moe(3n), 10000n);
  const twoThirdsPrecise = oneThirdPrecise.complement();

  t.deepEqual(moe(33000n), oneThirdDefault.scale(moe(100000n)));
  t.deepEqual(moe(67000n), twoThirdsDefault.scale(moe(100000n)));
  t.deepEqual(moe(66670n), twoThirdsPrecise.scale(moe(100000n)));
});

test('percentMath - non-standard thirds', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const oneThirdDefault = calculatePercent(moe(1n), moe(3n));
  const oneThirdBetter = calculatePercent(moe(1n), moe(3n), 1000n);
  const oneThirdPrecise = makePercent(1n, brand, 3n);

  t.deepEqual(moe(2970n), oneThirdDefault.scale(moe(9000n)));
  t.deepEqual(moe(2997n), oneThirdBetter.scale(moe(9000n)));
  t.deepEqual(moe(3000n), oneThirdPrecise.scale(moe(9000n)));
});

test('percentMath - larger than 100%', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const oneFiftyDefault = calculatePercent(moe(5n), moe(3n));
  const oneFiftyBetter = calculatePercent(moe(5n), moe(3n), 1000n);

  // 1.66 * 7777
  t.deepEqual(moe(12909n), oneFiftyDefault.scale(moe(7777n)));
  // 1.666 * 7777
  t.deepEqual(moe(12956n), oneFiftyBetter.scale(moe(7777n)));
});

test('percentMath - Nats only', t => {
  const { brand } = makeIssuerKit('moe');

  // @ts-ignore invalid arguments for testing
  t.throws(() => makePercent(10.1, brand), {
    message: '10.1 not a safe integer',
  });

  // @ts-ignore test with number even though deprecated
  t.notThrows(() => makePercent(47, brand));
});
