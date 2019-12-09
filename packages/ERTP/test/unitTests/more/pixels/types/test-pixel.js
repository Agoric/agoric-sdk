import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  insistWithinBounds,
  makeInsistPixel,
  isEqual,
  isLessThanOrEqual,
} from '../../../../../more/pixels/types/pixel';

test('pixel insistWithinBounds', t => {
  t.doesNotThrow(() => insistWithinBounds(0, 1));
  t.doesNotThrow(() => insistWithinBounds(1, 2));
  t.throws(
    () => insistWithinBounds(2, 2),
    /pixel position must be within bounds/,
  );
  t.throws(() => insistWithinBounds('a', 2), /not a safe integer/);
  t.throws(
    () => insistWithinBounds(0, 0),
    /pixel position must be within bounds/,
  );
  t.throws(() => insistWithinBounds(0, 'a'), /not a safe integer/);
  t.end();
});

test('pixel makeInsistPixel good', t => {
  t.deepEquals(makeInsistPixel(2)({ x: 0, y: 0 }), { x: 0, y: 0 });
  t.deepEquals(makeInsistPixel(1)({ x: 0, y: 0 }), { x: 0, y: 0 });
  // This doesn't throw because there is a default canvasSize
  t.deepEquals(makeInsistPixel(undefined)({ x: 0, y: 0 }), { x: 0, y: 0 });
  t.end();
});

test('pixel makeInsistPixel bad', t => {
  t.throws(() => makeInsistPixel('a')({ x: 0, y: 0 }), /not a safe integer/);
  t.throws(
    () => makeInsistPixel(1)({}),
    /pixels must have x, y properties only/,
  );
  t.throws(
    () => makeInsistPixel(1)({ x: 0, y: 3 }),
    /pixel position must be within bounds/,
  );
  t.throws(() => makeInsistPixel(1)({ x: 0, y: 'a' }), /not a safe integer/);
  t.throws(
    () => makeInsistPixel(1)({ x: 0, y: 3, empty: true }),
    /pixels must have x, y properties only/,
  );
  t.end();
});

// should only be used with valid Pixels
test('pixel isEqual', t => {
  const startPixel = harden({ x: 0, y: 0 });
  t.true(isEqual(startPixel, { x: 0, y: 0 }));
  t.false(isEqual(startPixel, { x: 1, y: 0 }));
  t.end();
});

test('pixel isLessThanOrEqual', t => {
  t.true(isLessThanOrEqual({ x: 0, y: 0 }, { x: 0, y: 0 }));
  t.true(isLessThanOrEqual({ x: 0, y: 0 }, { x: 2, y: 2 }));
  t.false(isLessThanOrEqual({ x: 2, y: 2 }, { x: 0, y: 0 }));
  t.false(isLessThanOrEqual({ x: 1, y: 0 }, { x: 0, y: 0 }));
  t.end();
});
