// @ts-check

// TODO Move this module somewhere more pleasantly reusable

import { Nat } from '@agoric/nat';

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
      return right.timeAuthority;
    }
  } else if (typeof right === 'bigint') {
    return left.timeAuthority;
  } else {
    const result = left.timeAuthority;
    assert.equal(result, right.timeAuthority);
    return result;
  }
};

/**
 * @type {TimeMathType}
 */
export const TimeMath = harden({
  absoluteTimeValue: abs =>
    (typeof abs === 'bigint' ? abs : Nat(abs.absoluteTimeValue)),
  relativeTimeValue: rel =>
    (typeof rel === 'bigint' ? rel : Nat(rel.relativeTimeValue)),
  add: (abs, rel) => {
    const absoluteTimeValue =
      TimeMath.absoluteTimeValue(abs) + TimeMath.relativeTimeValue(rel);
    const timeAuthority = sharedTimeAuthority(abs, rel);
    if (timeAuthority) {
      return harden({
        timeAuthority,
        absoluteTimeValue,
      });
    } else {
      return absoluteTimeValue;
    }
  },
  addRel: (rel1, rel2) => {
    const relativeTimeValue =
      TimeMath.relativeTimeValue(rel1) + TimeMath.relativeTimeValue(rel2);
    const timeAuthority = sharedTimeAuthority(rel1, rel2);
    if (timeAuthority) {
      return harden({
        timeAuthority,
        relativeTimeValue,
      });
    } else {
      return relativeTimeValue;
    }
  },
  mod: (abs, step) => {
    sharedTimeAuthority(abs, step); // just assert they're compat
    return TimeMath.absoluteTimeValue(abs) % TimeMath.relativeTimeValue(step);
  },
  modRel: (rel, step) => {
    sharedTimeAuthority(rel, step); // just assert they're compat
    return TimeMath.relativeTimeValue(rel) % TimeMath.relativeTimeValue(step);
  },
});
