// @ts-nocheck

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { mustBeComparable } from '@agoric/same-structure';

import './types';
import natMathHelpers from './mathHelpers/natMathHelpers';
import setMathHelpers from './mathHelpers/setMathHelpers';

// We want an enum, but narrowed to the AmountMathKind type.
/**
 * Constants for the kinds of amountMath we support.
 *
 * @type {{ NAT: 'nat', SET: 'set', STRING_SET: 'strSet' }}
 */
const MathKind = {
  NAT: 'nat',
  SET: 'set',
  STRING_SET: 'strSet',
};
harden(MathKind);
export { MathKind };

/**
 * @deprecated Please import `amountMath` from `@agoric/ertp` directly.
 * @param {Brand} brand
 * @param {AmountMathKind} amountMathKind
 * @returns {DeprecatedAmountMath}
 */
function makeAmountMath(brand, amountMathKind) {
  mustBeComparable(brand);
  assert.typeof(amountMathKind, 'string');

  const mathHelpers = {
    nat: natMathHelpers,
    set: setMathHelpers,
    strSet: setMathHelpers,
  };
  const helpers = mathHelpers[amountMathKind];
  assert(
    helpers !== undefined,
    X`unrecognized amountMathKind: ${amountMathKind}`,
  );

  // Cache the amount if we can.
  const cache = new WeakSet();

  /** @type {DeprecatedAmountMath} */
  const amountMath = Far('amountMath', {
    getBrand: () => brand,
    getAmountMathKind: () => amountMathKind,

    /**
     * Make an amount from a value by adding the brand.
     *
     * @param {Value} allegedValue
     * @returns {Amount}
     */
    make: allegedValue => {
      const value = helpers.doCoerce(allegedValue);
      const amount = harden({ brand, value });
      cache.add(amount);
      return amount;
    },

    /**
     * Make sure this amount is valid and return it if so, throwing if invalid.
     *
     * @param {Amount} allegedAmount
     * @returns {Amount} or throws if invalid
     */
    coerce: allegedAmount => {
      // If the cache already has the allegedAmount, that
      // means it is a valid amount.
      if (cache.has(allegedAmount)) {
        return allegedAmount;
      }
      const { brand: allegedBrand, value } = allegedAmount;
      assert(
        allegedBrand !== undefined,
        X`The brand in allegedAmount ${allegedAmount} is undefined. Did you pass a value rather than an amount?`,
      );
      assert(
        brand === allegedBrand,
        X`The brand in the allegedAmount ${allegedAmount} in 'coerce' didn't match the amountMath brand ${brand}.`,
      );
      // Will throw on inappropriate value
      return amountMath.make(value);
    },

    // Get the value from the amount.
    getValue: amount => amountMath.coerce(amount).value,

    // Represents the empty set/mathematical identity.
    // eslint-disable-next-line no-use-before-define
    getEmpty: () => empty,

    // Is the amount equal to the empty set?
    isEmpty: amount => helpers.doIsEmpty(amountMath.getValue(amount)),

    // Is leftAmount greater than or equal to rightAmount? In other
    // words, is everything in the rightAmount included in the
    // leftAmount?
    isGTE: (leftAmount, rightAmount) =>
      helpers.doIsGTE(
        amountMath.getValue(leftAmount),
        amountMath.getValue(rightAmount),
      ),

    // Is leftAmount equal to rightAmount?
    isEqual: (leftAmount, rightAmount) =>
      helpers.doIsEqual(
        amountMath.getValue(leftAmount),
        amountMath.getValue(rightAmount),
      ),

    // Combine leftAmount and rightAmount.
    add: (leftAmount, rightAmount) =>
      amountMath.make(
        helpers.doAdd(
          amountMath.getValue(leftAmount),
          amountMath.getValue(rightAmount),
        ),
      ),

    // Return the amount included in leftAmount but not included in
    // rightAmount. If leftAmount does not include all of rightAmount,
    // error.
    subtract: (leftAmount, rightAmount) =>
      amountMath.make(
        helpers.doSubtract(
          amountMath.getValue(leftAmount),
          amountMath.getValue(rightAmount),
        ),
      ),
  });
  const empty = amountMath.make(helpers.doMakeEmpty());
  return amountMath;
}

harden(makeAmountMath);

export { makeAmountMath };
