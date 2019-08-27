import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { insistPixel } from './types/pixel';
import { includesPixel } from './types/pixelList';
import { insist } from '../../util/insist';

// A pixelList is a naive collection of pixels in the form:
// [ { x: 0, y: 0 }, { x: 1, y: 1} ...]
// This is less than ideal for efficiency and expressiveness but will
// do for now
const makePixelStrategy = (canvasSize = 10) => {
  const pixelStrategy = harden({
    insistKind: pixelList => {
      insist(
        passStyleOf(harden(pixelList)) === 'copyArray',
      )`pixelList must be an array`;
      for (const pixel of pixelList) {
        insistPixel(pixel, canvasSize);
      }
      return harden(pixelList);
    },
    empty: _ => harden([]),
    isEmpty: pixelList => pixelList.length === 0,
    includes: (whole, part) => {
      for (const partPixel of part) {
        if (!includesPixel(whole, partPixel)) {
          return false; // return early if false
        }
      }
      return true;
    },
    equals: (left, right) =>
      pixelStrategy.includes(left, right) &&
      pixelStrategy.includes(right, left),
    with: (left, right) => {
      const combinedList = Array.from(left);
      for (const rightPixel of right) {
        if (!includesPixel(left, rightPixel)) {
          combinedList.push(rightPixel);
        }
      }
      return combinedList;
    },
    without: (whole, part) => {
      insist(pixelStrategy.includes(whole, part))`part is not in whole`;
      const wholeMinusPart = [];
      for (const wholePixel of whole) {
        if (!includesPixel(part, wholePixel)) {
          wholeMinusPart.push(wholePixel);
        }
      }
      return wholeMinusPart;
    },
  });
  return pixelStrategy;
};

harden(makePixelStrategy);

export { makePixelStrategy };
