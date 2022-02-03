// @ts-check

import { passStyleOf, assertRemotable, assertRecord } from '@endo/marshal';

import './types.js';
import { M, matches } from '@agoric/store';
import { natMathHelpers } from './mathHelpers/natMathHelpers.js';
import { setMathHelpers } from './mathHelpers/setMathHelpers.js';
import { copySetMathHelpers } from './mathHelpers/copySetMathHelpers.js';
import { copyBagMathHelpers } from './mathHelpers/copyBagMathHelpers.js';

const { details: X, quote: q } = assert;

/**
 * Constants for the kinds of assets we support.
 *
 * @type {{ NAT: 'nat', SET: 'set', COPY_SET: 'copySet', COPY_BAG: 'copyBag' }}
 */
const AssetKind = harden({
  NAT: 'nat',
  SET: 'set',
  COPY_SET: 'copySet',
  COPY_BAG: 'copyBag',
});
const assetKindNames = harden(Object.values(AssetKind).sort());

/** @type {AssertAssetKind} */
const assertAssetKind = allegedAK =>
  assert(
    assetKindNames.includes(allegedAK),
    X`The assetKind ${allegedAK} must be one of ${q(assetKindNames)}`,
  );
harden(assertAssetKind);

/**
 * Amounts describe digital assets. From an amount, you can learn the
 * brand of digital asset as well as "how much" or "how many". Amounts
 * have two parts: a brand (loosely speaking, the type of digital
 * asset) and the value (the answer to "how much"). For example, in
 * the phrase "5 bucks", "bucks" takes the role of the brand and the
 * value is 5. Amounts can describe fungible and non-fungible digital
 * assets. Amounts are pass-by-copy and can be made by and sent to
 * anyone.
 *
 * The issuer is the authoritative source of the amount in payments
 * and purses. The issuer must be able to do things such as add
 * digital assets to a purse and withdraw digital assets from a purse.
 * To do so, it must know how to add and subtract digital assets.
 * Rather than hard-coding a particular solution, we chose to
 * parameterize the issuer with a collection of polymorphic functions,
 * which we call `AmountMath`. These math functions include concepts
 * like addition, subtraction, and greater than or equal to.
 *
 * We also want to make sure there is no confusion as to what kind of
 * asset we are using. Thus, AmountMath includes checks of the
 * `brand`, the unique identifier for the type of digital asset. If
 * the wrong brand is used in AmountMath, an error is thrown and the
 * operation does not succeed.
 *
 * AmountMath uses mathHelpers to do most of the work, but then adds
 * the brand to the result. The function `value` gets the value from
 * the amount by removing the brand (amount -> value), and the
 * function `make` adds the brand to produce an amount (value ->
 * amount). The function `coerce` takes an amount and checks it,
 * returning an amount (amount -> amount).
 *
 * Each issuer of digital assets has an associated brand in a
 * one-to-one mapping. In untrusted contexts, such as in analyzing
 * payments and amounts, we can get the brand and find the issuer
 * which matches the brand. The issuer and the brand mutually validate
 * each other.
 */

/** @type {{
 *   nat: NatMathHelpers,
 *   set: SetMathHelpers,
 *   copySet: CopySetMathHelpers,
 *   copyBag: CopyBagMathHelpers
 * }} */
const helpers = {
  nat: natMathHelpers,
  set: setMathHelpers,
  copySet: copySetMathHelpers,
  copyBag: copyBagMathHelpers,
};

/** @type {(value: AmountValue) => AssetKind} */
const assertValueGetAssetKind = value => {
  const passStyle = passStyleOf(value);
  if (passStyle === 'bigint') {
    return 'nat';
  }
  if (passStyle === 'copyArray') {
    return 'set';
  }
  if (matches(value, M.set())) {
    return 'copySet';
  }
  if (matches(value, M.bag())) {
    return 'copyBag';
  }
  assert.fail(
    // TODO This isn't quite the right error message, in case valuePassStyle
    // is 'tagged'. We would need to distinguish what kind of tagged
    // object it is.
    // Also, this kind of manual listing is a maintenance hazard we
    // (TODO) will encounter when we extend the math helpers further.
    X`value ${value} must be a bigint, copySet, copyBag, or an array, not ${passStyle}`,
  );
};

/**
 *
 * Asserts that value is a valid AmountMath and returns the appropriate helpers.
 *
 * Made available only for testing, but it is harmless for other uses.
 *
 * @param {AmountValue} value
 * @returns {MathHelpers<*>}
 */
export const assertValueGetHelpers = value =>
  helpers[assertValueGetAssetKind(value)];

/** @type {(allegedBrand: Brand, brand?: Brand) => void} */
const optionalBrandCheck = (allegedBrand, brand) => {
  if (brand !== undefined) {
    assertRemotable(brand, 'brand');
    assert.equal(
      allegedBrand,
      brand,
      X`amount's brand ${allegedBrand} did not match expected brand ${brand}`,
    );
  }
};

/**
 * @param {Amount} leftAmount
 * @param {Amount} rightAmount
 * @param {Brand | undefined} brand
 * @returns {MathHelpers<*>}
 */
const checkLRAndGetHelpers = (leftAmount, rightAmount, brand = undefined) => {
  assertRecord(leftAmount, 'leftAmount');
  assertRecord(rightAmount, 'rightAmount');
  const { value: leftValue, brand: leftBrand } = leftAmount;
  const { value: rightValue, brand: rightBrand } = rightAmount;
  assertRemotable(leftBrand, 'leftBrand');
  assertRemotable(rightBrand, 'rightBrand');
  optionalBrandCheck(leftBrand, brand);
  optionalBrandCheck(rightBrand, brand);
  assert.equal(
    leftBrand,
    rightBrand,
    X`Brands in left ${leftBrand} and right ${rightBrand} should match but do not`,
  );
  const leftHelpers = assertValueGetHelpers(leftValue);
  const rightHelpers = assertValueGetHelpers(rightValue);
  assert.equal(
    leftHelpers,
    rightHelpers,
    X`The left ${leftAmount} and right amount ${rightAmount} had different assetKinds`,
  );
  return leftHelpers;
};

/**
 * @param {MathHelpers<AmountValue>} h
 * @param {Amount} leftAmount
 * @param {Amount} rightAmount
 * @returns {[AmountValue, AmountValue]}
 */
const coerceLR = (h, leftAmount, rightAmount) => {
  return [h.doCoerce(leftAmount.value), h.doCoerce(rightAmount.value)];
};

/** @type {AmountMath} */
const AmountMath = {
  make: (brand, allegedValue) => {
    assertRemotable(brand, 'brand');
    const h = assertValueGetHelpers(allegedValue);
    // @ts-ignore Needs better typing to express AmountValue to Helpers
    // relationship
    const value = h.doCoerce(allegedValue);
    return harden({ brand, value });
  },
  coerce: (brand, allegedAmount) => {
    assertRemotable(brand, 'brand');
    assertRecord(allegedAmount, 'amount');
    const { brand: allegedBrand, value: allegedValue } = allegedAmount;
    assert(
      brand === allegedBrand,
      X`The brand in the allegedAmount ${allegedAmount} in 'coerce' didn't match the specified brand ${brand}.`,
    );
    // Will throw on inappropriate value
    return AmountMath.make(brand, allegedValue);
  },
  getValue: (brand, amount) => AmountMath.coerce(brand, amount).value,
  makeEmpty: (brand, assetKind = AssetKind.NAT) => {
    assertRemotable(brand, 'brand');
    assertAssetKind(assetKind);
    const value = helpers[assetKind].doMakeEmpty();
    return harden({ brand, value });
  },
  makeEmptyFromAmount: amount => {
    assertRecord(amount, 'amount');
    const { brand, value } = amount;
    const assetKind = assertValueGetAssetKind(value);
    return AmountMath.makeEmpty(brand, assetKind);
  },
  isEmpty: (amount, brand = undefined) => {
    assertRecord(amount, 'amount');
    const { brand: allegedBrand, value } = amount;
    assertRemotable(allegedBrand, 'brand');
    optionalBrandCheck(allegedBrand, brand);
    const h = assertValueGetHelpers(value);
    // @ts-ignore Needs better typing to express AmountValue to Helpers relationship
    return h.doIsEmpty(h.doCoerce(value));
  },
  isGTE: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    // @ts-ignore Needs better typing to express AmountValue to Helpers relationship
    return h.doIsGTE(...coerceLR(h, leftAmount, rightAmount));
  },
  isEqual: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    // @ts-ignore Needs better typing to express AmountValue to Helpers relationship
    return h.doIsEqual(...coerceLR(h, leftAmount, rightAmount));
  },
  add: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    // @ts-ignore Needs better typing to express AmountValue to Helpers relationship
    const value = h.doAdd(...coerceLR(h, leftAmount, rightAmount));
    return harden({ brand: leftAmount.brand, value });
  },
  subtract: (leftAmount, rightAmount, brand = undefined) => {
    const h = checkLRAndGetHelpers(leftAmount, rightAmount, brand);
    // @ts-ignore Needs better typing to express AmountValue to Helpers relationship
    const value = h.doSubtract(...coerceLR(h, leftAmount, rightAmount));
    return harden({ brand: leftAmount.brand, value });
  },
};
harden(AmountMath);

const getAssetKind = amount => {
  assertRecord(amount, 'amount');
  const { value } = amount;
  return assertValueGetAssetKind(value);
};
harden(getAssetKind);

export { AmountMath, AssetKind, getAssetKind, assertAssetKind };
