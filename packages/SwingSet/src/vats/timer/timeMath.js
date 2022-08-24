// @ts-check

// TODO Move this module somewhere more pleasantly reusable

import { Nat } from '@agoric/nat';
import { fit } from '@agoric/store';

import { RelativeTimeSchema, TimestampSchema } from './typeGuards.js';

const { details: X, quote: q } = assert;

/**
 * `agreedTimerBrand` is internal to this module.
 *
 * @param {TimerBrand | undefined} leftBrand
 * @param {TimerBrand | undefined} rightBrand
 * @returns {TimerBrand | undefined}
 */
const agreedTimerBrand = (leftBrand, rightBrand) => {
  if (leftBrand === undefined) {
    if (rightBrand === undefined) {
      return undefined;
    } else {
      return rightBrand;
    }
  } else if (rightBrand === undefined) {
    return leftBrand;
  } else {
    assert.equal(
      leftBrand,
      rightBrand,
      X`TimerBrands must match: ${q(leftBrand)} vs ${q(rightBrand)}`,
    );
    return leftBrand;
  }
};

/**
 * `sharedTimerBrand` is internal to this module, and implements the
 * transitional brand checking and contaigion logic explained in the `TimeMath`
 * comment. It is used to define the binary operators that should follow
 * this logic. It does the error checking between the operands, and returns
 * the brand, if any, that should label the resulting time value.
 *
 * @param {Timestamp | RelativeTime} left
 * @param {Timestamp | RelativeTime} right
 * @returns {TimerBrand | undefined}
 */
const sharedTimerBrand = (left, right) => {
  const leftBrand = typeof left === 'bigint' ? undefined : left.timerBrand;
  const rightBrand = typeof right === 'bigint' ? undefined : right.timerBrand;
  return agreedTimerBrand(leftBrand, rightBrand);
};

/**
 * `absLike` is internal to this module, and used to implement the binary
 * operators in the case where the returned time should be a `Timestamp`
 * rather than a `RelativeTime`.
 *
 * @param {Timestamp | RelativeTime} left
 * @param {Timestamp | RelativeTime} right
 * @param {TimestampValue} absValue
 * @returns {Timestamp}
 */
const absLike = (left, right, absValue) => {
  Nat(absValue);
  const timerBrand = sharedTimerBrand(left, right);
  if (timerBrand) {
    return harden({
      timerBrand,
      absValue,
    });
  } else {
    return absValue;
  }
};

/**
 * `relLike` is internal to this module, and used to implement the binary
 * operators in the case where the returned time should be a `RelativeTime`
 * rather than a `Timestamp`.
 *
 * @param {Timestamp | RelativeTime} left
 * @param {Timestamp | RelativeTime} right
 * @param {RelativeTimeValue} relValue
 * @returns {RelativeTime}
 */
const relLike = (left, right, relValue) => {
  Nat(relValue);
  const timerBrand = sharedTimerBrand(left, right);
  if (timerBrand) {
    return harden({
      timerBrand,
      relValue,
    });
  } else {
    return relValue;
  }
};

// For all the following time operators, their documentation is in
// the `TimeMathType`, since that is the documentation that shows up
// in the IDE. Well, at least the vscode IDE.

const absValue = abs =>
  typeof abs === 'bigint' ? Nat(abs) : Nat(abs.absValue);

const relValue = rel =>
  typeof rel === 'bigint' ? Nat(rel) : Nat(rel.relValue);

const toAbs = (ts, brand = undefined) => {
  if (typeof ts === 'number') {
    ts = Nat(ts);
  }
  if (typeof ts === 'bigint') {
    if (brand === undefined) {
      return ts;
    } else {
      return harden({
        timerBrand: brand,
        absValue: ts,
      });
    }
  } else {
    const { timerBrand } = ts;
    agreedTimerBrand(timerBrand, brand);
    fit(ts, TimestampSchema, 'timestamp');
    return ts;
  }
};

const toRel = (rt, brand = undefined) => {
  if (typeof rt === 'number') {
    rt = Nat(rt);
  }
  if (typeof rt === 'bigint') {
    if (brand === undefined) {
      return rt;
    } else {
      return harden({
        timerBrand: brand,
        relValue: rt,
      });
    }
  } else {
    const { timerBrand } = rt;
    agreedTimerBrand(timerBrand, brand);
    fit(rt, RelativeTimeSchema, 'relativeTime');
    return rt;
  }
};

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

const isRelZero = rel => relValue(rel) === 0n;

const multiplyRelNat = (rel, nat) => relLike(rel, nat, relValue(rel) * nat);

const divideRelNat = (rel, nat) => relLike(rel, nat, relValue(rel) / nat);

const divideRelRel = (rel1, rel2) => {
  sharedTimerBrand(rel1, rel2); // just error check
  return relValue(rel1) / relValue(rel2);
};

const modAbsRel = (abs, step) =>
  relLike(abs, step, absValue(abs) % relValue(step));

const modRelRel = (rel, step) =>
  relLike(rel, step, relValue(rel) % relValue(step));

/**
 * `compareValues` is internal to this module, and used to implement
 * the time comparison operators.
 *
 * @param {bigint} v1
 * @param {bigint} v2
 * @returns {RankComparison}
 */
const compareValues = (v1, v2) => {
  if (v1 < v2) {
    return -1;
  } else if (v1 === v2) {
    return 0;
  } else {
    assert(v1 > v2);
    return 1;
  }
};

/**
 * The `TimeMath` object provides helper methods to do arithmetic on labeled
 * time values, much like `AmountMath` provides helper methods to do arithmetic
 * on labeled asset/money values. Both check for consistency of labels: a
 * binary operation on two labeled objects ensures that the both carry
 * the same label. If they produce another object from the same domain, it
 * will carry the same label. If the operands have incompatible labels,
 * an error is thrown.
 *
 * Unlike amount arithmetic, time arithmetic deals in two kinds of time objects:
 * Timestamps, which represent absolute time, and RelativeTime, which represents
 * the duration between two absolute times. Both kinds of time object
 * are labeled by a `TimerBrand`. For a Timestamp object, the value is
 * a bigint in an `absValue` property. For a RelativeTime object, the value
 * is a bigint in a `relValue` property. Thus we have a runtime safety check
 * to ensure that we don't confused the two, even if we have managed to fool
 * the (unsound) static type system.
 *
 * As a transitional measure, currently many Timestamps and RelativeTimes are
 * still represented by unlabeled bigints. During this transitional period,
 * we allow this, both statically and dynamically. For a normal binary
 * operation, if both inputs are labeled, then we do the full checking as
 * explained above and return a labeled result. If both inputs are unlabeled
 * bigints, we *assume* that they indicate a time of the right kind
 * (Timestamp vs RelativeTime) and timer brand. Since we don't know what
 * brand was intended, we can only return yet another unlabeled bigint.
 *
 * If one operand is labeled and the other is not, we check the labeled operand,
 * *assume* the unlabeled bigint represents the value needed for the other
 * operand, and return a labeled time object with the brand of the labeled
 * operand.
 *
 * @type {TimeMathType}
 */
export const TimeMath = harden({
  absValue,
  relValue,
  toAbs,
  toRel,
  addAbsRel,
  addRelRel,
  subtractAbsAbs,
  clampedSubtractAbsAbs,
  subtractAbsRel,
  subtractRelRel,
  isRelZero,
  multiplyRelNat,
  divideRelNat,
  divideRelRel,
  modAbsRel,
  modRelRel,
  compareAbs: (abs1, abs2) => compareValues(absValue(abs1), absValue(abs2)),
  compareRel: (rel1, rel2) => compareValues(relValue(rel1), relValue(rel2)),
});
