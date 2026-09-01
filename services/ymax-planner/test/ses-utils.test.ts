/* eslint-disable no-loss-of-precision */
import test from 'ava';

import { scaleToNat } from '../src/ses-utils.ts';

test('scaleToNat input validation', t => {
  const rejected = { message: /non-negative finite number/ };
  t.throws(() => scaleToNat('0', 6), rejected, 'string');
  t.throws(() => scaleToNat(0n, 6), rejected, 'bigint');
  t.throws(() => scaleToNat(NaN, 6), rejected, 'NaN');
  t.throws(() => scaleToNat(Infinity, 6), rejected, 'Infinity');
  t.throws(() => scaleToNat(-1, 6), rejected, 'negative');
});

test('scaleToNat fixed place count', t => {
  t.is(scaleToNat(1.23, 2), 123n);
  t.is(scaleToNat(1.23, 3), 1230n);
});

test('scaleToNat strictness', t => {
  const lossy = { message: /precision loss/ };
  t.throws(
    () => scaleToNat(17.578324000000002, 6),
    lossy,
    'strictness defaults to maximum',
  );
  t.throws(() => scaleToNat(17.578324000000002, 6, 9), lossy);
  t.is(scaleToNat(17.578324000000002, 6, 8), 17_578_324n);
  t.is(scaleToNat(17.578320000000002, 5, 9), 1_757_832n);
});
