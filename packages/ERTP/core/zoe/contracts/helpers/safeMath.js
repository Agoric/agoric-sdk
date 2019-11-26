import harden from '@agoric/harden';
import Nat from '@agoric/nat';
/**
 * These operations should be used for calculations with the
 * extents of basic fungible tokens.
 */
export const natSafeMath = harden({
  add: (x, y) => Nat(x + y),
  subtract: (x, y) => Nat(x - y),
  multiply: (x, y) => Nat(x * y),
  divide: (x, y) => Nat(Math.floor(x / y)),
});
