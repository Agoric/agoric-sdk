// @ts-check

import { Nat } from '@agoric/nat';

import '../types';

const identity = 0n;

/**
 * Fungible digital assets use the natMathHelpers to manage balances -
 * the operations are merely arithmetic on natural, non-negative
 * numbers.
 *
 * Natural numbers are used for fungible erights such as money because
 * rounding issues make floats problematic. All operations should be
 * done with the smallest whole unit such that the NatMathHelpers never
 * deals with fractional parts.
 *
 * @type {NatMathHelpers}
 */
const natMathHelpers = harden({
  doCoerce: Nat,
  doMakeEmpty: _ => identity,
  doIsEmpty: nat => nat === identity,
  doIsGTE: (left, right) => left >= right,
  doIsEqual: (left, right) => left === right,
  // BigInts don't observably overflow
  doAdd: (left, right) => left + right,
  doSubtract: (left, right) => Nat(left - right),
});

harden(natMathHelpers);
export default natMathHelpers;
