// @jessie-check

import { Fail } from '@endo/errors';
import { Nat, isNat } from '@endo/nat';

/** @import {MathHelpers, NatValue} from '../types.js' */

const empty = 0n;

/**
 * Fungible digital assets use the natMathHelpers to manage balances - the
 * operations are merely arithmetic on natural, non-negative numbers.
 *
 * Natural numbers are used for fungible erights such as money because rounding
 * issues make floats problematic. All operations should be done with the
 * smallest whole unit such that the `natMathHelpers` never deals with
 * fractional parts.
 *
 * @type {MathHelpers<NatValue>}
 */
export const natMathHelpers = harden({
  doCoerce: nat => {
    // TODO: tighten the definition of Nat in @agoric/nat to throw on `number`
    assert.typeof(nat, 'bigint');
    isNat(nat) || Fail`value ${nat} must be a natural number`;
    return Nat(nat);
  },
  doMakeEmpty: () => empty,
  doIsEmpty: nat => nat === empty,
  doIsGTE: (left, right) => left >= right,
  doIsEqual: (left, right) => left === right,
  // BigInts don't observably overflow
  doAdd: (left, right) => left + right,
  doSubtract: (left, right) => Nat(left - right),
});
