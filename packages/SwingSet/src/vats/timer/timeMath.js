// @ts-check

// TODO Move this module somewhere more pleasantly reusable

import { Nat } from '@agoric/nat';
import './types.js';

/**
 * @param {AbsoluteTimeish | Durationish} left
 * @param {AbsoluteTimeish | Durationish} right
 * @returns {TimerService | undefined}
 */
const sharedTimeAuthority = (left, right) => {
  if (typeof left === 'bigint') {
    if (typeof right === 'bigint') {
      return undefined;
    } else {
      return right.timerBrand;
    }
  } else if (typeof right === 'bigint') {
    return left.timerBrand;
  } else {
    const result = left.timerBrand;
    assert.equal(result, right.timerBrand);
    return result;
  }
};

/**
 * @param {AbsoluteTimeish | Durationish} left
 * @param {AbsoluteTimeish | Durationish} right
 * @param {Timestamp} absoluteTimeValue
 * @returns {AbsoluteTimeish}
 */
const absLike = (left, right, absoluteTimeValue) => {
  Nat(absoluteTimeValue);
  const timerBrand = sharedTimeAuthority(left, right);
  if (timerBrand) {
    return harden({
      timerBrand,
      absoluteTimeValue,
    });
  } else {
    return absoluteTimeValue;
  }
};

/**
 * @param {AbsoluteTimeish | Durationish} left
 * @param {AbsoluteTimeish | Durationish} right
 * @param {RelativeTime} relativeTimeValue
 * @returns {Durationish}
 */
const relLike = (left, right, relativeTimeValue) => {
  Nat(relativeTimeValue);
  const timerBrand = sharedTimeAuthority(left, right);
  if (timerBrand) {
    return harden({
      timerBrand,
      relativeTimeValue,
    });
  } else {
    return relativeTimeValue;
  }
};

const absValue = abs =>
  typeof abs === 'bigint' ? Nat(abs) : Nat(abs.absoluteTimeValue);

const relValue = rel =>
  typeof rel === 'bigint' ? Nat(rel) : Nat(rel.relativeTimeValue);

const addAbsRel = (abs, rel) =>
  absLike(abs, rel, absValue(abs) + relValue(rel));

const addRelRel = (rel1, rel2) =>
  relLike(rel1, rel2, relValue(rel1) + relValue(rel2));

const subtractAbsAbs = (abs1, abs2) =>
  relLike(abs1, abs2, absValue(abs1) - absValue(abs2));

const clampedSubtractAbsAbs = (abs1, abs2) => {
  const val1 = absValue(abs1);
  const val2 = absValue(abs2);
  return relLike(abs1, abs2, val1 > val2 ? val1 - val2 : 0n);
};

const subtractAbsRel = (abs, rel) =>
  absLike(abs, rel, absValue(abs) - relValue(rel));

const subtractRelRel = (rel1, rel2) =>
  relLike(rel1, rel2, relValue(rel1) - relValue(rel2));

const modAbsRel = (abs, step) => {
  sharedTimeAuthority(abs, step); // just assert they're compat
  return absValue(abs) % relValue(step);
};

const modRelRel = (rel, step) => {
  sharedTimeAuthority(rel, step); // just assert they're compat
  return relValue(rel) % relValue(step);
};

/**
 * @type {TimeMathType}
 */
export const TimeMath = harden({
  absoluteTimeValue: absValue,
  relativeTimeValue: relValue,
  addAbsRel,
  addRelRel,
  subtractAbsAbs,
  clampedSubtractAbsAbs,
  subtractAbsRel,
  subtractRelRel,
  modAbsRel,
  modRelRel,
});
