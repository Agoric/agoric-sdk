import Nat from '@agoric/nat';

const coerce = v => Nat(BigInt(v));

/**
 * These operations should be used for calculations with the
 * values of basic fungible tokens.
 *
 * The ERTP natMathHelpers are designed to be called only from ERTP's
 * amountMath.js, so they can assume the inputs are already valid and they only
 * need to validate the outputs when necessary. By contrast, safeMath is
 * designed to be used directly, and so it needs to validate the inputs,
 * as well as the outputs when necessary.
 *
 * TODO for now we coerce inputs rather than just validate them.
 * Once all callers are converted, should we remove this?
 */
export const natSafeMath = harden({
  // BigInts don't observably overflow
  add: (x, y) => coerce(x) + coerce(y),
  subtract: (x, y) => Nat(coerce(x) - coerce(y)),
  multiply: (x, y) => coerce(x) * coerce(y),
  floorDivide: (x, y) => coerce(x) / coerce(y),
  ceilDivide: (x, y) => {
    y = coerce(y);
    return Nat(coerce(x) + y - BigInt(1)) / y;
  },
  // Numbers and BigInts already compare magnitudes correctly.
  isGTE: (x, y) => x >= y,
});
