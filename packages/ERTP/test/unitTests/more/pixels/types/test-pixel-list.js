import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  makeWholePixelList,
  includesPixel,
} from '../../../../../more/pixels/types/pixelList';

import { makePixelExtentOps } from '../../../../../more/pixels/pixelExtentOps';

test('pixelList insistKind', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const thirdPixel = harden({ x: 0, y: 2 });
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  const pixelExtentOps = makePixelExtentOps();
  t.doesNotThrow(() => pixelExtentOps.insistKind(pixelList));
  t.throws(
    () => pixelExtentOps.insistKind(startPixel),
    /list must be an array/,
  );
  t.throws(
    () => pixelExtentOps.insistKind(harden({})),
    /list must be an array/,
  );
  t.doesNotThrow(() => pixelExtentOps.insistKind(harden([thirdPixel])));
  t.end();
});

test('pixelList includesPixel', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const thirdPixel = harden({ x: 0, y: 2 });
  const fourthPixel = harden({ x: 9, y: 1 });
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  t.true(includesPixel(pixelList, startPixel));
  t.true(includesPixel(pixelList, secondPixel));
  t.true(includesPixel(pixelList, thirdPixel));
  t.false(includesPixel(pixelList, fourthPixel));
  t.end();
});

test('pixelList includes', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const thirdPixel = harden({ x: 0, y: 2 });
  const fourthPixel = harden({ x: 9, y: 1 });
  const extentOps = makePixelExtentOps();
  t.true(extentOps.includes(harden([]), harden([])));
  t.true(extentOps.includes(harden([startPixel]), harden([])));
  t.true(extentOps.includes(harden([startPixel]), harden([startPixel])));
  t.true(
    extentOps.includes(harden([startPixel, secondPixel]), harden([startPixel])),
  );
  t.false(extentOps.includes(harden([]), harden([startPixel])));
  t.false(extentOps.includes(harden([startPixel]), harden([secondPixel])));
  t.false(
    extentOps.includes(
      harden([startPixel, thirdPixel]),
      harden([secondPixel, fourthPixel]),
    ),
  );
  t.false(
    extentOps.includes(
      [startPixel, secondPixel, thirdPixel],
      [thirdPixel, fourthPixel],
    ),
  );
  t.end();
});

test('pixelList with', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const extentOps = makePixelExtentOps();
  t.deepEqual(extentOps.with(harden([]), harden([])), []);
  t.deepEqual(extentOps.with(harden([startPixel]), harden([])), [startPixel]);
  t.deepEqual(extentOps.with(harden([]), harden([startPixel])), [startPixel]);
  t.deepEqual(extentOps.with(harden([startPixel]), harden([startPixel])), [
    startPixel,
  ]);
  t.deepEqual(extentOps.with(harden([startPixel]), harden([secondPixel])), [
    startPixel,
    secondPixel,
  ]);
  t.deepEqual(
    extentOps.with(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel, secondPixel],
  );
  t.end();
});

test('pixelList with deduplication', t => {
  const array5 = makeWholePixelList(5);
  const array10 = makeWholePixelList(10);
  const left = harden(array5.concat(array5)); // duplicate
  const right = harden(array10.concat(array10)); // duplicate

  // Left and right have two of everything, and right includes all of left.

  const extentOps = makePixelExtentOps();
  const result = extentOps.with(left, right);
  t.equal(result.length, 100);
  t.deepEqual(result, [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 9, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 6, y: 3 },
    { x: 7, y: 3 },
    { x: 8, y: 3 },
    { x: 9, y: 3 },
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 7, y: 4 },
    { x: 8, y: 4 },
    { x: 9, y: 4 },
    { x: 0, y: 5 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
    { x: 8, y: 5 },
    { x: 9, y: 5 },
    { x: 0, y: 6 },
    { x: 1, y: 6 },
    { x: 2, y: 6 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
    { x: 8, y: 6 },
    { x: 9, y: 6 },
    { x: 0, y: 7 },
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 },
    { x: 7, y: 7 },
    { x: 8, y: 7 },
    { x: 9, y: 7 },
    { x: 0, y: 8 },
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    { x: 6, y: 8 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 9, y: 8 },
    { x: 0, y: 9 },
    { x: 1, y: 9 },
    { x: 2, y: 9 },
    { x: 3, y: 9 },
    { x: 4, y: 9 },
    { x: 5, y: 9 },
    { x: 6, y: 9 },
    { x: 7, y: 9 },
    { x: 8, y: 9 },
    { x: 9, y: 9 },
  ]);
  t.end();
});

test('pixelList without', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const extentOps = makePixelExtentOps();
  t.deepEqual(extentOps.without(harden([]), harden([])), []);
  t.deepEqual(extentOps.without(harden([startPixel]), harden([])), [
    startPixel,
  ]);
  t.throws(
    () => extentOps.without(harden([]), harden([startPixel])),
    /part is not in whole/,
  );
  t.deepEqual(
    extentOps.without(harden([startPixel]), harden([startPixel])),
    [],
  );
  t.deepEqual(
    extentOps.without(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel],
  );
  t.deepEqual(
    extentOps.without(
      harden([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ]),
      harden([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ]),
    ),
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
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
