import { Nat } from '@endo/nat';

/** @typedef {(x: number | bigint, y: number | bigint) => NatValue} NatOp */

/**
 * These operations should be used for calculations with the values of
 * basic fungible tokens.
 *
 * natSafeMath is designed to be used directly, and so it needs to
 * validate the inputs, as well as the outputs when necessary.
 */
export const natSafeMath = harden({
  /** @type {NatOp} */
  // BigInts don't observably overflow
  add: (x, y) => Nat(x) + Nat(y),
  /** @type {NatOp} */
  subtract: (x, y) => Nat(Nat(x) - Nat(y)),
  /** @type {NatOp} */
  multiply: (x, y) => Nat(x) * Nat(y),
  /** @type {NatOp} */
  floorDivide: (x, y) => Nat(x) / Nat(y),
  /** @type {NatOp} */
  ceilDivide: (x, y) => {
    y = Nat(y);
    return Nat(Nat(x) + y - 1n) / y;
  },
  /**
   * Divide using half-to-even (aka Banker's Rounding) as in IEEE 774 default rounding
   *
   * @type {NatOp}
   */
  bankersDivide: (a, b) => {
    a = Nat(a);
    b = Nat(b);

    const div = a / b;
    const rem = a % b;
    // if remainder > half divisor, should have rounded up instead of down, so add 1
    if (rem * 2n > b) {
      return div + 1n;
    } else if (rem * 2n === b) {
      // Add 1 if result is odd to get an even return value
      if (div % 2n === 1n) return div + 1n;
    }
    return div;
  },
  /** @type {(x: number | bigint, y: number | bigint) => boolean} */
  isGTE: (x, y) => Nat(x) >= Nat(y),
});
