import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { insist } from '../../../util/insist';

function insistWithinBounds(num, canvasSize) {
  Nat(num);
  Nat(canvasSize);
  // 0 to canvasSize - 1
  insist(num >= 0 && num < canvasSize)`\
  pixel position must be within bounds`;
}

const makeInsistPixel = (canvasSize = 10) => pixel => {
  const properties = Object.getOwnPropertyNames(pixel);
  insist(properties.length === 2)`\
  pixels must have x, y properties only`;

  insistWithinBounds(pixel.x, canvasSize);
  insistWithinBounds(pixel.y, canvasSize);

  return pixel;
};

// should only be used with valid pixels - no checks
function isEqual(leftPixel, rightPixel) {
  return leftPixel.x === rightPixel.x && leftPixel.y === rightPixel.y;
}

// upper left is 0, 0
// lower right is NUM_PIXEL, NUM_PIXEL
// upper left is "less than" lower right

// should only be used with valid pixels
function isLessThanOrEqual(leftPixel, rightPixel) {
  return leftPixel.x <= rightPixel.x && leftPixel.y <= rightPixel.y;
}

function compare(a, b) {
  if (!a || !b) {
    return undefined;
  }
  const xLess = a.x < b.x;
  const yLess = a.y < b.y;
  const xEqual = a.x === b.x;
  const yEqual = a.y === b.y;

  if (xEqual && yEqual) {
    return 0;
  }

  // 1, 2 before 2, 1
  if (yLess) {
    return -1;
  }

  // 1, 2 before 1, 3
  if (yEqual && xLess) {
    return -1;
  }

  // must be greater
  return 1;
}

function getDistance(a, b) {
  const { x: xA, y: yA } = a;
  const { x: xB, y: yB } = b;
  return Math.floor(Math.sqrt((xA - xB) ** 2 + (yA - yB) ** 2));
}

function getDistanceFromCenter(pixel, canvasSize = 10) {
  const centerCoord = Math.floor(canvasSize / 2);
  const center = harden({ x: centerCoord, y: centerCoord });
  return getDistance(pixel, center);
}

function getString(pixel) {
  return `x${pixel.x}y${pixel.y}`;
}

export {
  insistWithinBounds,
  makeInsistPixel,
  isEqual,
  isLessThanOrEqual,
  getString,
  getDistance,
  getDistanceFromCenter,
  compare,
};
