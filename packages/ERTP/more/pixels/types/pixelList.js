import { isEqual } from './pixel';

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

function includesPixel(pixelList, pixel) {
  for (const p of pixelList) {
    if (isEqual(pixel, p)) {
      return true;
    }
  }
  return false;
}

export { makeWholePixelList, includesPixel };
