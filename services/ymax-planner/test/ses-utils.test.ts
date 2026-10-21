/* eslint-disable no-loss-of-precision */
import test from 'ava';

import { scaleToNat } from '../src/ses-utils.ts';

test('scaleToNat configuration validation', t => {
  t.throws(() => scaleToNat(0, -10), { message: /fixedPlaces/ });
  t.throws(() => scaleToNat(0, 2.5), { message: /fixedPlaces/ });
  t.throws(() => scaleToNat(0, 31), { message: /fixedPlaces/ });

  t.throws(() => scaleToNat(0, 1, -10), { message: /strictness/ });
  t.throws(() => scaleToNat(0, 1, 2.5), { message: /strictness/ });
  t.throws(() => scaleToNat(0, 1, 31), { message: /strictness/ });
});

test('scaleToNat value validation', t => {
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
  t.is(scaleToNat(0.01, 2), 1n);
  t.is(scaleToNat(0.01, 3), 10n);
  t.is(scaleToNat(0, 2), 0n);
  t.is(scaleToNat(0, 3), 0n);

  t.is(scaleToNat(0.09, 1, 0), 1n);
  t.is(scaleToNat(0.09, 1, 1), 1n);
  t.is(scaleToNat(1.09, 1, 0), 11n);
  t.is(scaleToNat(1.09, 1, 1), 11n);
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

  t.is(scaleToNat(1.00991, 2, 2), 101n);
  t.is(scaleToNat(1.0099, 2, 2), 101n);
  t.throws(() => scaleToNat(1.0098, 2, 2), lossy);
  t.throws(() => scaleToNat(1.009, 2, 2), lossy);

  // Exhaustively check 0.00_01_##.
  for (let i = 0; i < 100; i += 1) {
    const x = Number(`0.0001${String(i).padStart(2, '0')}`);
    t.throws(() => scaleToNat(x, 2, 2), lossy, `x=${x}`);
    t.is(scaleToNat(x, 2, 1), 0n, `x=${x}`);
    t.is(scaleToNat(x, 2, 0), 0n, `x=${x}`);
  }
});
