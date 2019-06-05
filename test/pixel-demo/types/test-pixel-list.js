import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  insistPixelList,
  includesPixel,
  insistIncludesPixel,
  includesPixelList,
  withPixelList,
  withoutPixelList,
  makeWholePixelList,
} from '../../../demo/pixel-demo/types/pixelList';

test('pixelList insistPixelList', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  const thirdPixel = { x: 0, y: 2 };
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  t.doesNotThrow(() => insistPixelList(pixelList, 5));
  t.throws(() => insistPixelList(startPixel, 5));
  t.throws(() => insistPixelList({}, 5));
  t.throws(() => insistPixelList([thirdPixel], 1));
  t.end();
});

test('pixelList includesPixel', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  const thirdPixel = { x: 0, y: 2 };
  const fourthPixel = { x: 9, y: 1 };
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  t.true(includesPixel(pixelList, startPixel));
  t.true(includesPixel(pixelList, secondPixel));
  t.true(includesPixel(pixelList, thirdPixel));
  t.false(includesPixel(pixelList, fourthPixel));
  t.end();
});

test('pixelList insistIncludesPixel', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  const thirdPixel = { x: 0, y: 2 };
  const fourthPixel = { x: 9, y: 1 };
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  t.doesNotThrow(() => insistIncludesPixel(pixelList, startPixel));
  t.doesNotThrow(() => insistIncludesPixel(pixelList, secondPixel));
  t.doesNotThrow(() => insistIncludesPixel(pixelList, thirdPixel));
  t.throws(() => insistIncludesPixel(pixelList, fourthPixel));
  t.end();
});

test('pixelList includesPixelList', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  const thirdPixel = { x: 0, y: 2 };
  const fourthPixel = { x: 9, y: 1 };
  t.true(includesPixelList(harden([]), harden([])));
  t.true(includesPixelList(harden([startPixel]), harden([])));
  t.true(includesPixelList(harden([startPixel]), harden([startPixel])));
  t.true(
    includesPixelList(harden([startPixel, secondPixel]), harden([startPixel])),
  );
  t.false(includesPixelList(harden([]), harden([startPixel])));
  t.false(includesPixelList(harden([startPixel]), harden([secondPixel])));
  t.false(
    includesPixelList(
      harden([startPixel, thirdPixel]),
      harden([secondPixel, fourthPixel]),
    ),
  );
  t.false(
    includesPixelList(
      [startPixel, secondPixel, thirdPixel],
      [thirdPixel, fourthPixel],
    ),
  );
  t.end();
});

test('pixelList withPixelList', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  t.deepEqual(withPixelList(harden([]), harden([])), []);
  t.deepEqual(withPixelList(harden([startPixel]), harden([])), [startPixel]);
  t.deepEqual(withPixelList(harden([]), harden([startPixel])), [startPixel]);
  t.deepEqual(withPixelList(harden([startPixel]), harden([startPixel])), [
    startPixel,
  ]);
  t.deepEqual(withPixelList(harden([startPixel]), harden([secondPixel])), [
    startPixel,
    secondPixel,
  ]);
  t.deepEqual(
    withPixelList(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel, secondPixel],
  );
  t.end();
});

test('pixelList withoutPixelList', t => {
  const startPixel = { x: 0, y: 0 };
  const secondPixel = { x: 0, y: 1 };
  t.deepEqual(withoutPixelList(harden([]), harden([])), []);
  t.deepEqual(withoutPixelList(harden([startPixel]), harden([])), [startPixel]);
  t.throws(() => withoutPixelList(harden([]), harden([startPixel])));
  t.deepEqual(withoutPixelList(harden([startPixel]), harden([startPixel])), []);
  t.deepEqual(
    withoutPixelList(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel],
  );
  t.deepEqual(
    withoutPixelList(
      harden([{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }]),
      harden([{ x: 0, y: 0 }, { x: 0, y: 1 }]),
    ),
    [{ x: 1, y: 0 }, { x: 1, y: 1 }],
  );

  t.end();
});

test('pixelList makeWholePixelList', t => {
  t.deepEqual(makeWholePixelList(0), []);
  t.deepEqual(makeWholePixelList(1), [
    {
      x: 0,
      y: 0,
    },
  ]);
  t.deepEqual(makeWholePixelList(2), [
    {
      x: 0,
      y: 0,
    },
    {
      x: 0,
      y: 1,
    },
    {
      x: 1,
      y: 0,
    },
    {
      x: 1,
      y: 1,
    },
  ]);
  t.end();
});
