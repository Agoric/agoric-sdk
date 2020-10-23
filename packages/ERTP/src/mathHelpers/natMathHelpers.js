// @ts-check

import Nat from '@agoric/nat';
import { assert, details as d, q } from '@agoric/assert';
import { patternKindOf } from '@agoric/same-structure';

import '../types';

const identity = 0;

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
 * @type {MathHelpers}
 */
const natMathHelpers = harden({
  doCoerce: Nat,
  doGetEmpty: _ => identity,
  doIsEmpty: nat => nat === identity,
  doIsGTE: (left, right) => left >= right,
  doIsEqual: (left, right) => left === right,
  doAdd: (left, right) => Nat(left + right),
  doSubtract: (left, right) => Nat(left - right),

  doFrugalSplit: (pattern, specimen) => {
    const patternKind = patternKindOf(pattern);
    if (patternKind === undefined) {
      Nat(pattern);
      if (specimen >= pattern) {
        return harden({
          matched: pattern,
          change: specimen - pattern,
        });
      }
      return undefined;
    }
    switch (patternKind) {
      case '*': {
        return harden({
          matched: identity,
          change: specimen,
        });
      }
      default: {
        throw assert.fail(d`Unexpected patternKind ${q(patternKind)}`);
      }
    }
  },
});

harden(natMathHelpers);
export default natMathHelpers;
