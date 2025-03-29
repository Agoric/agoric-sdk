// @jessie-check

import { M, matches } from '@endo/patterns';
/**
 * @import {AmountValue, Ratio} from './types.js'
 * @import {TypedPattern} from '@agoric/internal'
 * @import {CopyBag, CopySet, Pattern} from '@endo/patterns';
 */

export const BrandShape = M.remotable('Brand');

/**
 * When the AmountValue of an Amount fits the NatValueShape, i.e., when it is a
 * non-negative bigint, then it represents that many units of the fungible asset
 * represented by that amount. The brand of that amount should indeed represent
 * a kind of asset consisting of a countable set of fungible units.
 */
const NatValueShape = M.nat();

/**
 * When the AmountValue of an Amount fits the CopySetValueShape, i.e., when it
 * is a CopySet, then it represents the set of those keys, where each key
 * represents some individual non-fungible item, like a concert ticket, from the
 * non-fungible asset class represented by that amount's brand. The amount
 * itself represents the set of these items, as opposed to any of the other
 * items from the same asset class.
 *
 * If a given value class represents concert tickets, it seems bizarre that we
 * can form amounts of any key. The hard constraint is that the code that holds
 * the mint for that asset class---the one associated with that brand, only
 * mints the items representing the real units of that asset class as defined by
 * it. Anyone else can put together an amount expressing, for example, that they
 * "want" some items that will never be minted. That want will never be
 * satisfied. "You can't always get..."
 */
const CopySetValueShape = M.set();

/**
 * When the AmountValue of an Amount fits the SetValueShape, i.e., when it is a
 * CopyArray of passable Keys. This representation is deprecated.
 *
 * @deprecated Please change from using array-based SetValues to CopySet-based
 *   CopySetValues.
 */
const SetValueShape = M.arrayOf(M.key());

/**
 * When the AmountValue of an Amount fits the CopyBagValueShape, i.e., when it
 * is a CopyBag, then it represents the bag (multiset) of those keys, where each
 * key represents some individual semi-fungible item, like a concert ticket,
 * from the semi-fungible asset class represented by that amount's brand. The
 * number of times that key appears in the bag is the number of fungible units
 * of that key. The amount itself represents the bag of these items, as opposed
 * to any of the other items from the same asset class.
 *
 * If a given value class represents concert tickets, it seems bizarre that we
 * can form amounts of any key. The hard constraint is that the code that holds
 * the mint for that asset class---the one associated with that brand, only
 * mints the items representing the real units of that asset class as defined by
 * it. Anyone else can put together an amount expressing, for example, that they
 * "want" some items that will never be minted. That want will never be
 * satisfied. "You can't always get..."
 */
const CopyBagValueShape = M.bag();

const AmountValueShape = M.or(
  NatValueShape,
  CopySetValueShape,
  SetValueShape,
  CopyBagValueShape,
);

export const AmountShape = { brand: BrandShape, value: AmountValueShape };
harden(AmountShape);

/**
 * To be used to guard an amount pattern argument, i.e., an argument which is a
 * pattern that can be used to test amounts. Since amounts are keys, anywhere an
 * amount pattern is expected, an amount can be provided and will match only
 * that concrete amount, i.e., amounts that are `keyEQ` to that amount.
 *
 * The `AmountShape` guard above is an amount pattern. But not all amount
 * patterns are like `AmountShape`. For example, `M.any()` is a valid amount
 * pattern that will admit any amount, but is does not resemble the
 * `AmountShape` pattern above.
 */
export const AmountPatternShape = M.pattern();

/** @type {TypedPattern<Ratio>} */
export const RatioShape = { numerator: AmountShape, denominator: AmountShape };
harden(RatioShape);

/**
 * Returns true if value is a Nat bigint.
 *
 * @param {AmountValue} value
 * @returns {value is import('./types.js').NatValue}
 */
export const isNatValue = value => matches(value, NatValueShape);
harden(isNatValue);

/**
 * Returns true if value is a CopySet
 *
 * @param {AmountValue} value
 * @returns {value is CopySet}
 */
export const isCopySetValue = value => matches(value, CopySetValueShape);
harden(isCopySetValue);

/**
 * Returns true if value is a pass by copy array structure. Does not check for
 * duplicates. To check for duplicates, use setMathHelpers.coerce.
 *
 * @deprecated Please change from using array-based SetValues to CopySet-based
 *   CopySetValues.
 * @param {AmountValue} value
 * @returns {value is SetValue}
 */
export const isSetValue = value => matches(value, SetValueShape);
harden(isSetValue);

/**
 * Returns true if value is a CopyBag
 *
 * @param {AmountValue} value
 * @returns {value is CopyBag}
 */
export const isCopyBagValue = value => matches(value, CopyBagValueShape);
harden(isCopyBagValue);

// One GOOGOLth should be enough decimal places for anybody.
export const MAX_ABSOLUTE_DECIMAL_PLACES = 100;

export const AssetKindShape = M.or('nat', 'set', 'copySet', 'copyBag');
