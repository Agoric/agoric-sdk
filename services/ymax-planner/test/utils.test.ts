import test from 'ava';

import { parseBigInt } from '../src/ses-utils.js';

test('parseBigInt parses fixed decimal numbers', t => {
  t.is(parseBigInt(0), 0n);
  t.is(parseBigInt('12'), 12n);
  t.is(parseBigInt('+12'), 12n);
  t.is(parseBigInt(12, { fixedPlaces: 2, label: 'amount' }), 1_200n);
  t.is(parseBigInt(12.34, { fixedPlaces: 2, label: 'amount' }), 1_234n);
  t.is(parseBigInt(12.3, { fixedPlaces: 2, label: 'amount' }), 1_230n);
  t.is(parseBigInt('12.', { fixedPlaces: 2, label: 'amount' }), 1_200n);
  t.is(parseBigInt(-1.2, { fixedPlaces: 2, label: 'amount' }), -120n);
  t.is(parseBigInt(0.000001, { fixedPlaces: 6, label: 'amount' }), 1n);
});

test('parseBigInt rejects invalid parse options', t => {
  for (const fixedPlaces of [-1, 1.5, Number.NaN, '2'] as const) {
    t.throws(() => parseBigInt(1, { fixedPlaces, label: 'amount' } as any), {
      message: /amount parse options has invalid fixedPlaces/,
    });
  }
});

test('parseBigInt rejects non-decimal, over-precise, or unexpected decimal values', t => {
  for (const [value, message] of [
    [Number.POSITIVE_INFINITY, /amount "\[Infinity\]" is not a decimal real/],
    [Number.NaN, /amount "\[NaN\]" is not a decimal real/],
    [1e21, /amount 1e\+21 is not a decimal real/],
    [1.234, /amount 1\.234 has more than 2 decimal places/],
    [0.0000001, /amount 1e-7 is not a decimal real/],
  ] as const) {
    t.throws(() => parseBigInt(value, { fixedPlaces: 2, label: 'amount' }), {
      message,
    });
  }
  t.throws(() => parseBigInt('1.'), {
    message: /value "1\." has a decimal point but fixedPlaces is not set/,
  });
});

test('parseBigInt applies natural and safeInteger options', t => {
  t.is(parseBigInt(1.23, { fixedPlaces: 2, natural: true }), 123n);
  t.throws(() => parseBigInt(-1, { natural: true, label: 'amount' }), {
    message: /amount -1 output is not a natural integer/,
  });
  t.is(
    parseBigInt(Number.MAX_SAFE_INTEGER, { safeInteger: true }),
    9007199254740991n,
  );
  t.throws(() => parseBigInt('9007199254740992', { safeInteger: true }), {
    message:
      /value "9007199254740992" output cannot be casted to a safe integer/,
  });
});
