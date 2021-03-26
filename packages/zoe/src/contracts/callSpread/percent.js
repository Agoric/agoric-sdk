// @ts-check

// some tools to make treating ratios as percents easier

import { assert, details as X } from '@agoric/assert';

import { makeRatio, assertIsRatio, natSafeMath } from '../../contractSupport';

const { subtract } = natSafeMath;

const BASIS_POINTS = 10000n;

// If ratio is between 0 and 1, subtract from 1.
export function oneMinus(ratio) {
  assertIsRatio(ratio);
  assert(
    ratio.numerator.brand === ratio.denominator.brand,
    X`oneMinus only supports ratios with a single brand, but ${ratio.numerator.brand} doesn't match ${ratio.denominator.brand}`,
  );
  assert(
    ratio.numerator.value <= ratio.denominator.value,
    X`Parameter must be less than or equal to 1: ${ratio.numerator.value}/${ratio.denominator.value}`,
  );
  return makeRatio(
    subtract(ratio.denominator.value, ratio.numerator.value),
    ratio.numerator.brand,
    ratio.denominator.value,
    ratio.denominator.brand,
  );
}

export function make100Percent(brand) {
  return makeRatio(BASIS_POINTS, brand, BASIS_POINTS);
}

export function make0Percent(brand) {
  return makeRatio(0n, brand);
}
