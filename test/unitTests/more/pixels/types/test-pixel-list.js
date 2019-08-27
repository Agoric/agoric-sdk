import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  makeWholePixelList,
  includesPixel,
} from '../../../../../more/pixels/types/pixelList';

import { makePixelStrategy } from '../../../../../more/pixels/pixelStrategy';

test('pixelList insistKind', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const thirdPixel = harden({ x: 0, y: 2 });
  const pixelList = harden([startPixel, secondPixel, thirdPixel]);
  const pixelStrategy = makePixelStrategy();
  t.doesNotThrow(() => pixelStrategy.insistKind(pixelList));
  t.throws(
    () => pixelStrategy.insistKind(startPixel),
    'pixelList must be an array',
  );
  t.throws(() => pixelStrategy.insistKind({}), 'pixelList must be an array');
  t.doesNotThrow(() => pixelStrategy.insistKind([thirdPixel]));
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
  const strategy = makePixelStrategy();
  t.true(strategy.includes(harden([]), harden([])));
  t.true(strategy.includes(harden([startPixel]), harden([])));
  t.true(strategy.includes(harden([startPixel]), harden([startPixel])));
  t.true(
    strategy.includes(harden([startPixel, secondPixel]), harden([startPixel])),
  );
  t.false(strategy.includes(harden([]), harden([startPixel])));
  t.false(strategy.includes(harden([startPixel]), harden([secondPixel])));
  t.false(
    strategy.includes(
      harden([startPixel, thirdPixel]),
      harden([secondPixel, fourthPixel]),
    ),
  );
  t.false(
    strategy.includes(
      [startPixel, secondPixel, thirdPixel],
      [thirdPixel, fourthPixel],
    ),
  );
  t.end();
});

test('pixelList with', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const strategy = makePixelStrategy();
  t.deepEqual(strategy.with(harden([]), harden([])), []);
  t.deepEqual(strategy.with(harden([startPixel]), harden([])), [startPixel]);
  t.deepEqual(strategy.with(harden([]), harden([startPixel])), [startPixel]);
  t.deepEqual(strategy.with(harden([startPixel]), harden([startPixel])), [
    startPixel,
  ]);
  t.deepEqual(strategy.with(harden([startPixel]), harden([secondPixel])), [
    startPixel,
    secondPixel,
  ]);
  t.deepEqual(
    strategy.with(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel, secondPixel],
  );
  t.end();
});

test('pixelList without', t => {
  const startPixel = harden({ x: 0, y: 0 });
  const secondPixel = harden({ x: 0, y: 1 });
  const strategy = makePixelStrategy();
  t.deepEqual(strategy.without(harden([]), harden([])), []);
  t.deepEqual(strategy.without(harden([startPixel]), harden([])), [startPixel]);
  t.throws(() => strategy.without(harden([]), harden([startPixel])));
  t.deepEqual(strategy.without(harden([startPixel]), harden([startPixel])), []);
  t.deepEqual(
    strategy.without(harden([startPixel, secondPixel]), harden([secondPixel])),
    [startPixel],
  );
  t.deepEqual(
    strategy.without(
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
