/* global harden */

import Nat from '@agoric/nat';

// Fungible digital assets use the natMathHelpers to manage balances -
// the operations are merely arithmetic on natural, non-negative
// numbers.

// Natural numbers are used for fungible erights such as money because
// rounding issues make floats problematic. All operations should be
// done with the smallest whole unit such that the NatMathHelpers never
// deals with fractional parts.

const identity = 0;

const natMathHelpers = harden({
  doCoerce: Nat,
  doGetEmpty: _ => identity,
  doIsEmpty: nat => nat === identity,
  doIsGTE: (left, right) => left >= right,
  doIsEqual: (left, right) => left === right,
  doAdd: (left, right) => Nat(left + right),
  doSubtract: (left, right) => Nat(left - right),
});

export default harden(natMathHelpers);
