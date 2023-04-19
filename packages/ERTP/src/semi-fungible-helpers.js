import { getCopyBagEntries, makeCopyBagFromElements } from '@agoric/store';
import { AmountMath } from './amountMath.js';

const { Fail } = assert;

/**
 * A Semifungible Amount has a CopyBag (multiset) as a value. A CopyBag has
 * some number of unique elements, and each unique element has an associated
 * count that says how may times that unique element is in the CopyMap.
 *
 * It turns out that a lot of code wants to handle semi fungible amounts whose
 * value contains exactly one elemet, i.e., exactly one unique element,
 * present with a count of 1. `getTheSemifungibleElement` both validates
 * that the argument amount satisfies these assumptions, and then returns
 * that one element.
 *
 * @param {Amount<'copyBag'>} amount
 * @param {Brand} brand
 * If `brand` is provided, use it for further validation. Otherwise
 * proceed assuming that `amount.brand` is the correct
 * `brand`.
 * @returns {Key}
 */
export const getTheSemifungibleElement = (amount, brand = amount.brand) => {
  const value = AmountMath.getValue(brand, amount);

  // We rely on `getCopyBagEntries` to validate that `value` is a
  // well formed CopyBag, so we don't need to check the type first.
  // @ts-expect-error
  const entries = getCopyBagEntries(value);
  entries.length === 1 ||
    Fail`Expected semi-fungle of only one element: ${amount}`;
  entries[0][1] === 1n ||
    Fail`Expected only one occurrence of unique element: ${amount}`;
  return entries[0][0];
};
harden(getTheSemifungibleElement);

/**
 * The dual construction side would be to take a `brand` and an element
 * and construct a semi fungible amount containing only that one element
 * one time. `makeSemifungibleAmount`, when called with exactly two arguments,
 * does exactly this. But `makeSemifungibleAmount` is actually n-ary, with
 * a spread of all the elements, so it can be used for non-unique semi-fungible
 * amounts as well.
 *
 * @type {(brand: Brand, ...elements: Key[]) => Amount<'copyBag'>}
 */
export const makeSemifungibleAmount = (brand, ...elements) => {
  const value = makeCopyBagFromElements(elements);
  // @ts-expect-error type param problems again
  return AmountMath.make(brand, value);
};
harden(makeSemifungibleAmount);
