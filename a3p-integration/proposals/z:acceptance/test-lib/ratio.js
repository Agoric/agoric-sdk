import { AmountMath } from '@agoric/ertp';
import { q, Fail } from '@endo/errors';

/**
 * Is `allegedNum` a number in the [contiguous range of exactly and
 * unambiguously
 * representable](https://esdiscuss.org/topic/more-numeric-constants-please-especially-epsilon#content-14)
 *  natural numbers (non-negative integers)?
 *
 * To qualify `allegedNum` must either be a
 * non-negative `bigint`, or a non-negative `number` representing an integer
 * within range of [integers safely representable in
 * floating point](https://tc39.es/ecma262/#sec-number.issafeinteger).
 *
 * @param {unknown} allegedNum
 * @returns {boolean}
 */
function isNat(allegedNum) {
  if (typeof allegedNum === 'bigint') {
    return allegedNum >= 0;
  }
  if (typeof allegedNum !== 'number') {
    return false;
  }

  return Number.isSafeInteger(allegedNum) && allegedNum >= 0;
}

/**
 * If `allegedNumber` passes the `isNat` test, then return it as a bigint.
 * Otherwise throw an appropriate error.
 *
 * If `allegedNum` is neither a bigint nor a number, `Nat` throws a `TypeError`.
 * Otherwise, if it is not a [safely
 * representable](https://esdiscuss.org/topic/more-numeric-constants-please-especially-epsilon#content-14)
 * non-negative integer, `Nat` throws a `RangeError`.
 * Otherwise, it is converted to a bigint if necessary and returned.
 *
 * @param {unknown} allegedNum
 * @returns {bigint}
 */
function Nat(allegedNum) {
  if (typeof allegedNum === 'bigint') {
    if (allegedNum < 0) {
      throw RangeError(`${allegedNum} is negative`);
    }
    return allegedNum;
  }

  if (typeof allegedNum === 'number') {
    if (!Number.isSafeInteger(allegedNum)) {
      throw RangeError(`${allegedNum} is not a safe integer`);
    }
    if (allegedNum < 0) {
      throw RangeError(`${allegedNum} is negative`);
    }
    return BigInt(allegedNum);
  }

  throw TypeError(
    `${allegedNum} is a ${typeof allegedNum} but must be a bigint or a number`,
  );
}

/**
 * These operations should be used for calculations with the values of
 * basic fungible tokens.
 *
 * natSafeMath is designed to be used directly, and so it needs to
 * validate the inputs, as well as the outputs when necessary.
 */
export const natSafeMath = harden({
  // BigInts don't observably overflow
  add: (x, y) => Nat(x) + Nat(y),
  subtract: (x, y) => Nat(Nat(x) - Nat(y)),
  multiply: (x, y) => Nat(x) * Nat(y),
  floorDivide: (x, y) => Nat(x) / Nat(y),
  ceilDivide: (x, y) => {
    y = Nat(y);
    return Nat(Nat(x) + y - 1n) / y;
  },
});

const ratioPropertyNames = ['numerator', 'denominator'];

export const assertIsRatio = ratio => {
  const keys = Object.keys(ratio);
  keys.length === 2 || Fail`Ratio ${ratio} must be a record with 2 fields.`;
  for (const name of keys) {
    ratioPropertyNames.includes(name) ||
      Fail`Parameter must be a Ratio record, but ${ratio} has ${q(name)}`;
  }
  const numeratorValue = ratio.numerator.value;
  const denominatorValue = ratio.denominator.value;
  isNat(numeratorValue) ||
    Fail`The numerator value must be a NatValue, not ${numeratorValue}`;
  isNat(denominatorValue) ||
    Fail`The denominator value must be a NatValue, not ${denominatorValue}`;
};

/**
 * @param {import('@agoric/ertp/src/types.js').Amount<'nat'>} amount
 * @param {*} ratio
 * @param {*} divideOp
 * @returns {import('@agoric/ertp/src/types.js').Amount<'nat'>}
 */
const multiplyHelper = (amount, ratio, divideOp) => {
  AmountMath.coerce(amount.brand, amount);
  assertIsRatio(ratio);
  amount.brand === ratio.denominator.brand ||
    Fail`amount's brand ${q(amount.brand)} must match ratio's denominator ${q(
      ratio.denominator.brand,
    )}`;

  return /** @type {import('@agoric/ertp/src/types.js').Amount<'nat'>} */ (
    AmountMath.make(
      ratio.numerator.brand,
      divideOp(
        natSafeMath.multiply(amount.value, ratio.numerator.value),
        ratio.denominator.value,
      ),
    )
  );
};

export const ceilMultiplyBy = (amount, ratio) => {
  return multiplyHelper(amount, ratio, natSafeMath.ceilDivide);
};
