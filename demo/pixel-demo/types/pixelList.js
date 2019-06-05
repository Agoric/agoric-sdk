import { insistPixel, isEqual } from './pixel';
import { passStyleOf } from '../../../src/kernel/marshal';

import { insist } from '../../../collections/insist';

// pixelList is the most naive bundling of pixels
// it is just an array of pixels
function insistPixelList(pixelList, canvasSize) {
  insist(passStyleOf(pixelList) === 'copyArray')`pixelList must be an array`;
  for (let i = 0; i < pixelList.length; i += 1) {
    insistPixel(pixelList[i], canvasSize);
  }
}

// does not check validity of the pixel or pixelList
function includesPixel(pixelList, pixel) {
  let result = false;
  for (const p of pixelList) {
    if (isEqual(pixel, p)) {
      result = true;
    }
  }
  return result;
}

// does not check validity of the pixel or pixelList
// does pixelList include pixel
function insistIncludesPixel(pixelList, pixel) {
  insist(includesPixel(pixelList, pixel))`pixel is not in pixelList`;
}

// does left include right?
function includesPixelList(leftPixelList, rightPixelList) {
  // iterate through the pixels in the rightPixelList, see if left
  // includes it

  // if rightPixelList is empty, this just returns true
  for (let i = 0; i < rightPixelList.length; i += 1) {
    const rightPixel = rightPixelList[i];
    const result = includesPixel(leftPixelList, rightPixel);
    if (!result) {
      return false; // return early if false
    }
  }
  return true;
}

function insistIncludesPixelList(leftPixelList, rightPixelList) {
  insist(includesPixelList(leftPixelList, rightPixelList))`\
  leftPixelList is not in rightPixelList`;
}

function withPixelList(leftPixelList, rightPixelList) {
  const combinedList = Array.from(leftPixelList);
  for (const rightPixel of rightPixelList) {
    if (!includesPixel(leftPixelList, rightPixel)) {
      combinedList.push(rightPixel);
    }
  }
  return combinedList;
}

// Covering set subtraction of erights.
// If leftAmount does not include rightAmount, error.
// Describe the erights described by `leftAmount` and not described
// by `rightAmount`.
function withoutPixelList(leftPixelList, rightPixelList) {
  insistIncludesPixelList(leftPixelList, rightPixelList);
  const leftMinusRight = [];
  for (const leftPixel of leftPixelList) {
    if (!includesPixel(rightPixelList, leftPixel)) {
      leftMinusRight.push(leftPixel);
    }
  }
  return leftMinusRight;
}

function makeWholePixelList(canvasSize) {
  const pixelList = [];
  for (let x = 0; x < canvasSize; x += 1) {
    for (let y = 0; y < canvasSize; y += 1) {
      pixelList.push({
        x,
        y,
      });
    }
  }
  return pixelList;
}

export {
  insistPixelList,
  includesPixel,
  insistIncludesPixel,
  includesPixelList,
  withPixelList,
  withoutPixelList,
  makeWholePixelList,
};
