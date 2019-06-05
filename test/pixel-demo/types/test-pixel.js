import { test } from 'tape-promise/tape';

import {
  insistWithinBounds,
  insistPixel,
  isEqual,
  isLessThanOrEqual,
} from '../../../demo/pixel-demo/types/pixel';

test('pixel insistWithinBounds', t => {
  t.doesNotThrow(() => insistWithinBounds(0, 1));
  t.doesNotThrow(() => insistWithinBounds(1, 2));
  t.throws(() => insistWithinBounds(2, 2));
  t.throws(() => insistWithinBounds('a', 2));
  t.throws(() => insistWithinBounds(0, 0));
  t.throws(() => insistWithinBounds(0, 'a'));
  t.end();
});

test('pixel insistPixel', t => {
  t.doesNotThrow(() => insistPixel({ x: 0, y: 0 }, 2));
  t.doesNotThrow(() => insistPixel({ x: 0, y: 0 }, 1));
  t.throws(() => insistPixel({ x: 0, y: 0 }, 'a'));
  t.throws(() => insistPixel({}, 1));
  t.throws(() => insistPixel({ x: 0, y: 0 }, undefined));
  t.throws(() => insistPixel({ x: 0, y: 3 }, 1));
  t.throws(() => insistPixel({ x: 0, y: 'a' }, 1));
  t.throws(() => insistPixel({ x: 0, y: 3, empty: true }, 1));
  t.end();
});

// should only be used with valid Pixels
test('pixel isEqual', t => {
  const startPixel = { x: 0, y: 0 };
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
