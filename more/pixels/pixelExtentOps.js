import harden from '@agoric/harden';

import { makeInsistPixel, isEqual, compare } from './types/pixel';
import { makeListExtentOps } from '../../core/config/extentOps/listExtentOps';

// A pixelList is a naive collection of pixels in the form:
// [ { x: 0, y: 0 }, { x: 1, y: 1} ...]
// This is less than ideal for efficiency and expressiveness but will
// do for now
const makePixelExtentOps = (canvasSize = 10) => {
  return makeListExtentOps(makeInsistPixel(canvasSize), isEqual, compare);
};

harden(makePixelExtentOps);

export { makePixelExtentOps };
