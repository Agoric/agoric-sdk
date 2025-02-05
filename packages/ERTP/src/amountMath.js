import { q, Fail } from '@endo/errors';
import { assertRemotable, assertRecord } from '@endo/pass-style';
import { kindOf } from '@endo/patterns';

import { natMathHelpers } from './mathHelpers/natMathHelpers.js';
import { setMathHelpers } from './mathHelpers/setMathHelpers.js';
import { copySetMathHelpers } from './mathHelpers/copySetMathHelpers.js';
import { copyBagMathHelpers } from './mathHelpers/copyBagMathHelpers.js';

/**
 * @import {Passable} from '@endo/pass-style'
 * @import {CopyBag, CopySet} from '@endo/patterns';
 * @import {Amount, AmountBound, AmountValueBound, AssetValueForKind, Brand, CopyBagAmount, CopySetAmount, MathHelpers, NatAmount, NatValue, SetAmount, SetValue} from './types.js';
 */

// NB: AssetKind is both a constant for enumerated values and a type for those values.
/**
 * Constants for the kinds of assets we support.
 *
 * @enum {(typeof AssetKind)[keyof typeof AssetKind]}
 */
export const AssetKind = /** @type {const} */ ({
  NAT: 'nat',
  SET: 'set',
  COPY_SET: 'copySet',
  COPY_BAG: 'copyBag',
});
harden(AssetKind);
const assetKindNames = harden(Object.values(AssetKind).sort());

/** @param {AssetKind} allegedAK */
export const assertAssetKind = allegedAK => {
  assetKindNames.includes(allegedAK) ||
    Fail`The assetKind ${allegedAK} must be one of ${q(assetKindNames)}`;
};
harden(assertAssetKind);

/**
 * Amounts describe digital assets. From an amount, you can learn the brand of
 * digital asset as well as "how much" or "how many". Amounts have two parts: a
 * brand (loosely speaking, the type of digital asset) and the value (the answer
 * to "how much"). For example, in the phrase "5 bucks", "bucks" takes the role
 * of the brand and the value is 5. Amounts can describe fungible and
 * non-fungible digital assets. Amounts are pass-by-copy and can be made by and
 * sent to anyone.
 *
 * The issuer is the authoritative source of the amount in payments and purses.
 * The issuer must be able to do things such as add digital assets to a purse
 * and withdraw digital assets from a purse. To do so, it must know how to add
 * and subtract digital assets. Rather than hard-coding a particular solution,
 * we chose to parameterize the issuer with a collection of polymorphic
 * functions, which we call `AmountMath`. These math functions include concepts
 * like addition, subtraction, and greater than or equal to.
 *
 * We also want to make sure there is no confusion as to what kind of asset we
 * are using. Thus, AmountMath includes checks of the `brand`, the unique
 * identifier for the type of digital asset. If the wrong brand is used in
 * AmountMath, an error is thrown and the operation does not succeed.
 *
 * AmountMath uses mathHelpers to do most of the work, but then adds the brand
 * to the result. The function `value` gets the value from the amount by
 * removing the brand (amount -> value), and the function `make` adds the brand
 * to produce an amount (value -> amount). The function `coerce` takes an amount
 * and checks it, returning an amount (amount -> amount).
 *
 * Each issuer of digital assets has an associated brand in a one-to-one
 * mapping. In untrusted contexts, such as in analyzing payments and amounts, we
 * can get the brand and find the issuer which matches the brand. The issuer and
 * the brand mutually validate each other.
 */

const helpers = {
  nat: natMathHelpers,
  set: setMathHelpers,
  copySet: copySetMathHelpers,
  copyBag: copyBagMathHelpers,
};

/**
 * @template {AmountValueBound} V=AmountValueBound
 * @param {V} value
 * @param {AssetKind} [defaultKind]
 * @returns {AssetKind}
 */
const assertValueBoundGetAssetKind = (value, defaultKind = undefined) => {
  const kind = kindOf(value);
  switch (kind) {
    case 'bigint': {
      return 'nat';
    }
    case 'copyArray': {
      return 'set';
    }
    case 'copySet':
    case 'copyBag': {
      return kind;
    }
    case 'match:has': {
      if (defaultKind === undefined) {
        throw Fail`defaultKind expected for right has-bound ${value}`;
      }
      return defaultKind;
    }
    default: {
      throw Fail`value ${value} must be an AmountValueBound, not ${q(kind)}`;
    }
  }
};

/**
 * Asserts that value is a valid AmountMath and returns the appropriate helpers.
 *
 * Made available only for testing, but it is harmless for other uses.
 *
 * @template {AmountValueBound} V=AmountValueBound
 * @param {V} value
 * @param {AssetKind} [defaultKind]
 * @returns {MathHelpers<V>}
 */
export const assertValueBoundGetHelpers = (value, defaultKind = undefined) =>
  // @ts-expect-error cast
  helpers[assertValueBoundGetAssetKind(value, defaultKind)];

/** @type {(allegedBrand: Brand, brand?: Brand) => void} */
const optionalBrandCheck = (allegedBrand, brand) => {
  if (brand !== undefined) {
    assertRemotable(brand, 'brand');
    allegedBrand === brand ||
      Fail`amount's brand ${q(allegedBrand)} did not match expected brand ${q(
        brand,
      )}`;
  }
};

/**
 * @template {AssetKind} K
 * @param {Amount<K>} leftAmount
 * @param {AmountBound<K>} rightAmountBound
 * @param {Brand<K> | undefined} brand
 * @returns {MathHelpers<any>}
 */
const checkLRAndGetHelpers = (
  leftAmount,
  rightAmountBound,
  brand = undefined,
) => {
  assertRecord(leftAmount, 'leftAmount');
  assertRecord(rightAmountBound, 'rightAmountBound');
  const { brand: leftBrand, value: leftValue } = leftAmount;
  const { brand: rightBrand, value: rightValueBound } = rightAmountBound;
  assertRemotable(leftBrand, 'leftBrand');
  assertRemotable(rightBrand, 'rightBrand');
  optionalBrandCheck(leftBrand, brand);
  optionalBrandCheck(rightBrand, brand);
  leftBrand === rightBrand ||
    Fail`Brands in left ${q(leftBrand)} and right ${q(
      rightBrand,
    )} should match but do not`;
  const leftKind = assertValueBoundGetAssetKind(leftValue);
  const rightKind = assertValueBoundGetAssetKind(rightValueBound, leftKind);
  leftKind === rightKind ||
    Fail`The left ${leftAmount} and right amount ${rightAmountBound} had different assetKinds: ${q(leftKind)} vs ${q(rightKind)}`;
  return helpers[leftKind];
};

/**
 * @template {AssetKind} K
 * @param {MathHelpers<AssetValueForKind<K>>} h
 * @param {Amount<K>} leftAmount
 * @param {AmountBound<K>} rightAmountBound
 * @returns {[K, K]}
 */
const coerceLR = (h, leftAmount, rightAmountBound) => {
  // @ts-expect-error could be arbitrary subtype
  return [h.doCoerce(leftAmount.value), h.doCoerce(rightAmountBound.value)];
};

/**
 * Returns true if the leftAmount is greater than or equal to the
 * rightAmountBound. The notion of "greater than or equal to" depends on the
 * kind of amount, as defined by the MathHelpers. For example, whether rectangle
 * A is greater than rectangle B depends on whether rectangle A includes
 * rectangle B as defined by the logic in MathHelpers.
 *
 * @template {AssetKind} K
 * @param {Amount<K>} leftAmount
 * @param {AmountBound<K>} rightAmountBound
 * @param {Brand<K>} [brand]
 * @returns {boolean}
 */
const isGTE = (leftAmount, rightAmountBound, brand = undefined) => {
  const h = checkLRAndGetHelpers(leftAmount, rightAmountBound, brand);
  return h.doIsGTE(...coerceLR(h, leftAmount, rightAmountBound));
};

/**
 * Logic for manipulating amounts.
 *
 * Amounts are the canonical description of tradable goods. They are manipulated
 * by issuers and mints, and represent the goods and currency carried by purses
 * and payments. They can be used to represent things like currency, stock, and
 * the abstract right to participate in a particular exchange.
 */
export const AmountMath = {
  // TODO use overloading to handle when Brand has an AssetKind and when it doesn't.
  // a AmountForValue utility could help DRY those cases.
  /**
   * Make an amount from a value by adding the brand.
   *
   * Does not verify that the Brand's AssetKind matches the value's.
   *
   * @template {Brand} B
   * @template {NatValue | CopySet | CopyBag | SetValue} V
   * @param {B} brand
   * @param {V} allegedValue
   * @returns {B extends Brand<'nat'>
   *     ? NatAmount
   *     : V extends NatValue
   *       ? NatAmount
   *       : V extends CopySet
   *         ? CopySetAmount<V['payload'][0]>
   *         : V extends CopyBag
   *           ? CopyBagAmount<V['payload'][0][0]>
   *           : V extends SetValue
   *             ? SetAmount<V[0]>
   *             : never}
   */
  make: (brand, allegedValue) => {
    assertRemotable(brand, 'brand');
    const h = assertValueBoundGetHelpers(allegedValue);
    const value = h.doCoerce(allegedValue);
    // @ts-expect-error cast
    return harden({ brand, value });
  },
  /**
   * Make sure this amount is valid enough, and return a corresponding valid
   * amount if so.
   *
   * @template {Amount} A
   * @param {Brand} brand
   * @param {A} allegedAmount
   * @returns {A}
   */
  coerce: (brand, allegedAmount) => {
    assertRemotable(brand, 'brand');
    assertRecord(allegedAmount, 'amount');
    const { brand: allegedBrand, value: allegedValue } = allegedAmount;
    brand === allegedBrand ||
      Fail`The brand in the allegedAmount ${allegedAmount} in 'coerce' didn't match the specified brand ${brand}.`;
    // Will throw on inappropriate value
    // @ts-expect-error cast
    return AmountMath.make(brand, allegedValue);
  },
  /**
   * Extract and return the value.
   *
   * @template {Amount} A
   * @param {Brand} brand
   * @param {A} amount
   * @returns {A['value']}
   */
  getValue: (brand, amount) => AmountMath.coerce(brand, amount).value,
  /**
   * Return the amount representing an empty amount. This is the identity
   * element for MathHelpers.add and MatHelpers.subtract.
   *
   * @type {{
   *   (brand: Brand): Amount<'nat'>;
   *   <K extends AssetKind>(brand: Brand<K>, assetKind: K): Amount<K>;
   * }}
   */
  makeEmpty: (brand, assetKind = /** @type {const} */ ('nat')) => {
    assertRemotable(brand, 'brand');
    assertAssetKind(assetKind);
    const value = helpers[assetKind].doMakeEmpty();
    // @ts-expect-error XXX narrowing from function overload
    return harden({ brand, value });
  },
  /**
   * Return the amount representing an empty amount, using another amount as the
   * template for the brand and assetKind.
   *
   * @template {Amount} A
   * @param {A} amount
   * @returns {A}
   */
  makeEmptyFromAmount: amount => {
    assertRecord(amount, 'amount');
    const { brand, value } = amount;
    const assetKind = assertValueBoundGetAssetKind(value);
    // @ts-expect-error different subtype
    return AmountMath.makeEmpty(brand, assetKind);
  },
  /**
   * Return true if the Amount is empty. Otherwise false.
   *
   * @param {Amount} amount
   * @param {Brand} [brand]
   * @returns {boolean}
   */
  isEmpty: (amount, brand = undefined) => {
    assertRecord(amount, 'amount');
    const { brand: allegedBrand, value } = amount;
    assertRemotable(allegedBrand, 'brand');
    optionalBrandCheck(allegedBrand, brand);
    const h = assertValueBoundGetHelpers(value);
    return h.doIsEmpty(h.doCoerce(value));
  },
  isGTE,
  /**
   * Returns true if the leftAmount equals the rightAmount. We assume that if
   * isGTE is true in both directions, isEqual is also true
   *
   * @template {Amount} A
   * @param {A} leftAmount
   * @param {A} rightAmount
   * @param {Brand} [brand]
   * @returns {boolean}
   */
  isEqual: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    return h.doIsEqual(...coerceLR(h, leftAmount, rightAmount));
  },
  /**
   * Returns a new amount that is the union of both leftAmount and rightAmount.
   *
   * For fungible amount this means adding the values. For other kinds of
   * amount, it usually means including all of the elements from both left and
   * right.
   *
   * @template {Amount} A
   * @param {A} leftAmount
   * @param {A} rightAmount
   * @param {Brand} [brand]
   * @returns {A}
   */
  add: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    const value = h.doAdd(...coerceLR(h, leftAmount, rightAmount));
    // @ts-expect-error different subtype
    return harden({ brand: leftAmount.brand, value });
  },
  /**
   * Returns a new amount that is the leftAmount minus the rightAmount (i.e.
   * everything in the leftAmount that is not in the rightAmount). If leftAmount
   * doesn't include rightAmount (subtraction results in a negative), throw an
   * error. Because the left amount must include the right amount, this is NOT
   * equivalent to set subtraction.
   *
   * @template {Amount} L
   * @template {Amount} R
   * @param {L} leftAmount
   * @param {R} rightAmount
   * @param {Brand} [brand]
   * @returns {L extends R ? L : never}
   */
  subtract: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    const value = h.doSubtract(...coerceLR(h, leftAmount, rightAmount));
    // @ts-expect-error different subtype
    return harden({ brand: leftAmount.brand, value });
  },
  /**
   * Returns the min value between x and y using isGTE
   *
   * @template {Amount} A
   * @param {A} x
   * @param {A} y
   * @param {Brand} [brand]
   * @returns {A}
   */
  min: (x, y, brand = undefined) =>
    // eslint-disable-next-line no-nested-ternary
    isGTE(x, y, brand)
      ? y
      : isGTE(y, x, brand)
        ? x
        : Fail`${x} and ${y} are incomparable`,
  /**
   * Returns the max value between x and y using isGTE
   *
   * @template {Amount} A
   * @param {A} x
   * @param {A} y
   * @param {Brand} [brand]
   * @returns {A}
   */
  max: (x, y, brand = undefined) =>
    // eslint-disable-next-line no-nested-ternary
    isGTE(x, y, brand)
      ? x
      : isGTE(y, x)
        ? y
        : Fail`${x} and ${y} are incomparable`,
};
harden(AmountMath);

/** @param {Amount} amount */
export const getAssetKind = amount => {
  assertRecord(amount, 'amount');
  const { value } = amount;
  return assertValueBoundGetAssetKind(value);
};
harden(getAssetKind);
