/* global BigInt */
// @ts-check

import Nat from '@agoric/nat';
import { assert, details, q } from '@agoric/assert';

import '../types';

const identity = '0';
const bigint0 = BigInt(0);

/**
 * Fungible digital assets use the decimalMathHelpers to manage balances -
 * the operations are arbitrary precision arithmetic on string representations
 * of decimal, non-negative numbers.
 *
 * Fixed-point representation is used for fungible erights such as money because
 * rounding issues make floats problematic. All operations should be scaled by
 * the number of decimal places specified by calling this maker such that the
 * DecimalMathHelpers never deals with fractional parts less than 1/10**places.
 *
 * @param {number} [places=0]
 * @returns {MathHelpers}
 */
const makeDecimalMathHelpers = (places = 0) => {
  Nat(places);
  const bigscale = BigInt(10) ** BigInt(places);

  /**
   * Parse an input string into canonical units and decimals.
   *
   * @param {string} instr loose input string
   * @returns {[string, string]} units and decimals, respectively
   */
  const parse = instr => {
    assert.typeof(instr, 'string');
    const match = instr.match(/^0*(\d+)(\.(\d*[1-9])?0*)?$/);
    assert(match, details`${instr} must be a non-negative decimal number`);
    const units = match[1];
    const decimals = match[3] || '';
    assert(
      decimals.length <= places,
      details`${instr} exceeds ${q(places)} decimal places`,
    );
    return [units, decimals];
  };

  /**
   * Convert a canonical decimal string to a bigint.
   *
   * @param {string} decimal
   * @returns {bigint}
   */
  const toBigint = decimal => {
    const [units, decimals] = parse(decimal);
    const intstr = `${units}${decimals.padEnd(places, '0')}`;
    return BigInt(intstr);
  };

  const toString = bigint => {
    const decimals = bigint % bigscale;
    const units = bigint / bigscale;
    if (!decimals) {
      return `${units}`;
    }
    return `${units}.${decimals}`;
  };

  const decimalMathHelpers = harden({
    doCoerce(instr) {
      const [units, decimals] = parse(instr);
      if (!decimals) {
        return units;
      }
      // Return canonical form.
      return `${units}.${decimals}`;
    },
    doGetEmpty: _ => identity,
    doIsEmpty: decimal => decimal === identity,
    doIsGTE(left, right) {
      return toBigint(left) >= toBigint(right);
    },
    doIsEqual(left, right) {
      // Already in canonical form.
      return left === right;
    },
    doAdd(left, right) {
      const sum = toBigint(left) + toBigint(right);
      return toString(sum);
    },
    doSubtract(left, right) {
      const diff = toBigint(left) - toBigint(right);
      assert(diff >= bigint0, details`difference ${diff} must be nonnegative`);
      return toString(diff);
    },
  });

  harden(decimalMathHelpers);
  return decimalMathHelpers;
};

harden(makeDecimalMathHelpers);
export default makeDecimalMathHelpers;
