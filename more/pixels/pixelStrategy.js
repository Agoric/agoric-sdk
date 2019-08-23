import harden from '@agoric/harden';

import {
  insistPixelList,
  includesPixelList,
  withPixelList,
  withoutPixelList,
} from './types/pixelList';

// A pixelList is a naive collection of pixels in the form:
// [ { x: 0, y: 0 }, { x: 1, y: 1} ...]
// This is less than ideal for efficiency and expressiveness but will
// do for now
const makePixelStrategy = canvasSize => {
  const pixelStrategy = harden({
    insistKind: pixelList => {
      insistPixelList(pixelList, canvasSize);
      return harden(pixelList);
    },
    empty: _ => harden([]),
    isEmpty: pixelList => pixelList.length === 0,
    includes: (whole, part) => includesPixelList(whole, part),
    equals: (left, right) =>
      pixelStrategy.includes(left, right) &&
      pixelStrategy.includes(right, left),
    with: (left, right) => harden(withPixelList(left, right)),
    without: (whole, part) => harden(withoutPixelList(whole, part)),
  });
  return pixelStrategy;
};

harden(makePixelStrategy);

export { makePixelStrategy };
