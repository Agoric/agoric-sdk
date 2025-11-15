// some tools to make treating ratios as percents easier

import { makeRatio } from '../../contractSupport/index.js';

/**
 * @import {Make100Percent} from './types-ambient.js';
 * @import {Make0Percent} from './types-ambient.js';
 */

const BASIS_POINTS = 10000n;

/** @type {Make100Percent} */
export function make100Percent(brand) {
  return makeRatio(BASIS_POINTS, brand, BASIS_POINTS);
}

/** @type {Make0Percent} */
export function make0Percent(brand) {
  return makeRatio(0n, brand);
}
