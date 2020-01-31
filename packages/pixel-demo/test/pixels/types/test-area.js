import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  insistArea,
  isEqual,
  makeArea,
  includes,
} from '../../../../../more/pixels/types/area';

test('area insistArea', t => {
  t.doesNotThrow(() =>
    insistArea(
      {
        start: { x: 0, y: 0 },
        end: { x: 2, y: 2 },
      },
      5,
    ),
  );
  t.doesNotThrow(() =>
    insistArea(
      {
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
      },
      5,
    ),
  );
  t.throws(
    () =>
      insistArea(
        {
          end: { x: 0, y: 0 },
        },
        5,
      ),
    /areas must have start, end properties only/,
  );
  t.throws(
    () =>
      insistArea(
        {
          start: { x: 0, y: 0 },
          end: { x: 3, y: 0 },
        },
        1,
      ),
    /pixel position must be within bounds/,
  );
  t.throws(
    () =>
      insistArea(
        {
          start: { x: 3, y: 0 },
          end: { x: 0, y: 0 },
        },
        5,
      ),
    /the starting pixel must be "less than or equal" to the ending pixel/,
  );
  t.end();
});

test('area isEqual', t => {
  const start = harden({ x: 2, y: 2 });
  const end = harden({ x: 4, y: 4 });
  t.true(isEqual({ start, end }, { start, end }));

  t.false(
    isEqual(
      {
        start: { x: 1, y: 3 },
        end,
      },
      { start, end },
    ),
  );
  t.end();
});

test('area includes', t => {
  const start = harden({ x: 2, y: 2 });
  const end = harden({ x: 4, y: 4 });
  t.true(includes({ start, end }, { x: 3, y: 3 }));
  t.true(includes({ start, end }, { x: 2, y: 2 }));
  t.false(includes({ start, end }, { x: 0, y: 0 }));
  t.end();
});

test('area makeArea', t => {
  // makeArea(allegedArea, pixelList, canvasSize)
  const start = harden({ x: 2, y: 2 });
  const end = harden({ x: 4, y: 4 });
  const pixelList = [
    start,
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 2 },
    { x: 4, y: 3 },
    end,
  ];

  t.deepEqual(makeArea({ start, end }, pixelList, 5), { start, end });
  t.end();
});
