import { M, matches } from '@agoric/store';

/**
 * When the Value of an Amount fits the NatValueShape, i.e., when it is
 * a non-negative bigint, then it represents that many units of the
 * fungible asset represented by that amount. The brand of that amount
 * should indeed represent a kind of asset consisting of a countable
 * set of fungible units.
 */
const NatValueShape = M.nat();

/**
 * When the Value of an Amount fits the SetValueShape, i.e., when it
 * is a CopyArray of passable Keys, then it represents the set of those
 * keys, where each key represents some individual non fungible
 * item, like a concert ticket, from the non-fungible asset class
 * represented by that amount's brand. The amount itself represents
 * the set of these items, as opposed to any of the other items
 * from the same asset class.
 *
 * Currently, this set can only be represented by an array in this
 * position. However, we intend to replace this with a direct use
 * of a CopySet. As a transitional measure, at some stage we will
 * accept both and deprecate the array representation. At some
 * later stage, we intend to stop supporting the array representation,
 * but such transitions are difficult. We might instead phase in
 * the CopySet representation as a third kind of Value, in addition
 * to Nat and CopyArray.
 *
 * If a given value class represents concert tickets, it seems bizarre
 * that we can form amounts of any key. The hard constraint is that
 * the code that holds the mint for that asset class---the one associated
 * with that brand, only mints the items representing the real units
 * of that asset class as defined by it. Anyone else can put together
 * an amount expressing, for example, that they "want" some items that
 * will never be minted. That want will never be satisfied.
 * "You can't always get..."
 */
const SetValueShape = M.arrayOf(M.key());
const AmountValueShape = M.or(NatValueShape, SetValueShape);

export const AmountShape = harden({
  brand: M.remotable(),
  value: AmountValueShape,
});

/**
 * Returns true if value is a Nat bigint.
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
const isNatValue = value => matches(value, NatValueShape);
harden(isNatValue);

/**
 * Returns true if value is a pass by copy array structure. Does not
 * check for duplicates. To check for duplicates, use setMathHelpers.coerce.
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
const isSetValue = value => matches(value, SetValueShape);
harden(isSetValue);

export { isNatValue, isSetValue };
