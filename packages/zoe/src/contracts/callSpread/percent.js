// @ts-check

// some tools to make treating ratios as percents easier

import { makeRatio } from '../../contractSupport';

const BASIS_POINTS = 10000n;

export function make100Percent(brand) {
  return makeRatio(BASIS_POINTS, brand, BASIS_POINTS);
}

export function make0Percent(brand) {
  return makeRatio(0n, brand);
}
