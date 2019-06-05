import Nat from '@agoric/nat';

import { insist } from '../../../collections/insist';

function insistWithinBounds(num, canvasSize) {
  Nat(num);
  Nat(canvasSize);
  // 0 to canvasSize - 1
  insist(num >= 0 && num < canvasSize)`\
  pixel position must be within bounds`;
}

function insistPixel(pixel, canvasSize) {
  const properties = Object.getOwnPropertyNames(pixel);
  insist(properties.length === 2)`\
  pixels must have x, y properties only`;

  insistWithinBounds(pixel.x, canvasSize);
  insistWithinBounds(pixel.y, canvasSize);
}

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

export { insistWithinBounds, insistPixel, isEqual, isLessThanOrEqual };
