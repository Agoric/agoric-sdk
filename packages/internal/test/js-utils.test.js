// @ts-check
import '@endo/init/debug.js';

import test from 'ava';

import { naiveCompare } from '../src/js-utils.js';
import { arrayIsLike } from '../tools/ava-assertions.js';

test('naiveCompare: bigints', t => {
  const inputs = [0n, 1n, -1n, 42n];
  const outputs = [...inputs, ...inputs].sort(naiveCompare);
  arrayIsLike(
    t,
    outputs,
    [-1n, 0n, 1n, 42n].flatMap(x => [x, x]),
  );
});

test('naiveCompare: numbers', t => {
  const inputs = [0, -0, 1, -1, 3.14, 3, 4, -Infinity, Infinity, NaN, 42];
  const outputs = [...inputs, ...inputs].sort(naiveCompare);
  arrayIsLike(
    t,
    outputs,
    [-Infinity, -1, 0, 0, 1, 3, 3.14, 4, 42, Infinity, NaN].flatMap(x =>
      x === 0 ? [0, -0] : [x, x],
    ),
  );
  // Sort stability means the relative position of zeros must be deterministic.
  const zeros = outputs.filter(x => x === 0);
  const zeroSigns = zeros.map(x => (Object.is(x, -0) ? '-' : '+'));
  t.is(zeroSigns.join(''), '+-+-');
});

test('naiveCompare: strings', t => {
  const inputs = [
    // all-ASCII
    ...['foo', 'bar', 'baz', 'Foo', 'Bar', 'Baz', '_', '1', '\0'],
    // non-ASCII BMP
    ...[
      '\u{FF21}',
      '\u{A66E}',
      '\u{751F}',
      '\u{2042}',
      '\u{16DD}',
      '\u{10B2}',
      '\u{03C3}',
      '\u{00A4}',
    ],
    // non-BMP
    ...['\u{1D306}'],
    // unpaired surrogates
    ...['\uD800', '\uDC00', '\uDBFF', '\uDFFF', '\uDC00\uDBFF'],
  ];
  const outputs = [...inputs, ...inputs].sort(naiveCompare);
  arrayIsLike(
    t,
    outputs,
    [
      '\0',
      '1',
      'Bar',
      'Baz',
      'Foo',
      '_',
      'bar',
      'baz',
      'foo',
      '\u{00A4}',
      '\u{03C3}',
      '\u{10B2}',
      '\u{16DD}',
      '\u{2042}',
      '\u{751F}',
      '\u{A66E}',
      '\uD800',
      '\u{1D306}',
      '\u{DBFF}',
      '\uDC00',
      '\uDC00\uDBFF',
      '\uDFFF',
      '\u{FF21}',
    ].flatMap(x => [x, x]),
  );
});
