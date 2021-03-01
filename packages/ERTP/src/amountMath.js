// @ts-check

import { assert, details as X } from '@agoric/assert';
import { mustBeComparable } from '@agoric/same-structure';
import { passStyleOf, REMOTE_STYLE } from '@agoric/marshal';
import { Nat, isNat } from '@agoric/nat';

import './types';
import natMathHelpers from './mathHelpers/natMathHelpers';
import setMathHelpers from './mathHelpers/setMathHelpers';

// We want an enum, but narrowed to the AmountMathKind type.
/**
 * Constants for the kinds of amountMath we support.
 *
 * @type {{ NAT: 'nat', SET: 'set' }}
 */
const MathKind = {
  NAT: 'nat',
  SET: 'set',
};
harden(MathKind);

/**
 * Amounts describe digital assets. From an amount, you can learn the
 * kind of digital asset as well as "how much" or "how many". Amounts
 * have two parts: a brand (the kind of digital asset) and the value
 * (the answer to "how much"). For example, in the phrase "5 bucks",
 * "bucks" takes the role of the brand and the value is 5. Amounts
 * can describe fungible and non-fungible digital assets. Amounts are
 * pass-by-copy and can be made by and sent to anyone.
 *
 * The issuer has an internal table that maps purses and payments to
 * amounts. The issuer must be able to do things such as add digital
 * assets to a purse and withdraw digital assets from a purse. To do
 * so, it must know how to add and subtract digital assets. Rather
 * than hard-coding a particular solution, we chose to parameterize
 * the issuer with a collection of polymorphic functions, which we
 * call `amountMath`. These math functions include concepts like
 * addition, subtraction, and greater than or equal to.
 *
 * We also want to make sure there is no confusion as to what kind of
 * asset we are using. Thus, amountMath includes checks of the
 * `brand`, the unique identifier for the type of digital asset. If
 * the wrong brand is used in amountMath, an error is thrown and the
 * operation does not succeed.
 *
 * amountMath uses mathHelpers to do most of the work, but then adds
 * the brand to the result. The function `value` gets the value from
 * the amount by removing the brand (amount -> value), and the function
 * `make` adds the brand to produce an amount (value -> amount). The
 * function `coerce` takes an amount and checks it, returning an amount (amount
 * -> amount).
 *
 * Each issuer of digital assets has an associated brand in a one-to-one
 * mapping. In untrusted contexts, such as in analyzing payments and
 * amounts, we can get the brand and find the issuer which matches the
 * brand. The issuer and the brand mutually validate each other.
 */

/** @type {{ nat: NatMathHelpers, set: SetMathHelpers }} */
const helpers = {
  nat: natMathHelpers,
  set: setMathHelpers,
};

/**
 * @template {NatValue | SetValue} V
 * @type {(value: V) => MathHelpers<V> }
 */
const getHelpersFromValue = value => {
  if (Array.isArray(value)) {
    return setMathHelpers;
  }
  assert(
    typeof Nat(value) === 'bigint',
    X`value ${value} must be a bigint or an array`,
  );
  return natMathHelpers;
};

/** @type {(amount: Amount ) => MathHelpers} */
const getHelpersFromAmount = amount => {
  return getHelpersFromValue(amount.value);
};

/** @type {(leftAmount: Amount, rightAmount: Amount ) => MathHelpers} */
const getHelpers = (leftAmount, rightAmount) => {
  const leftHelpers = getHelpersFromAmount(leftAmount);
  const rightHelpers = getHelpersFromAmount(rightAmount);
  assert.equal(leftHelpers, rightHelpers);
  return leftHelpers;
};

/** @type {(amount: Amount, brand?: Brand) => void} */
const optionalBrandCheck = (amount, brand) => {
  if (brand !== undefined) {
    mustBeComparable(brand);
    assert.equal(amount.brand, brand);
  }
};

/** @type {(value: Value, brand: Brand) => Amount} */
const noCoerceMake = (value, brand) => {
  const amount = harden({ brand, value });
  return amount;
};

const assertLooksLikeValue = value => {
  assert(
    Array.isArray(value) || (typeof value === 'bigint' && isNat(value)),
    X`value ${value} must be a Nat or an array`,
  );
};

const brandMethods = ['isMyIssuer', 'getAllegedName', 'getDisplayInfo'];

const assertLooksLikeBrand = brand => {
  assert(
    typeof brand === 'object',
    X`The brand ${brand} doesn't look like a brand. Did you pass a value rather than an amount?`,
  );
  const ownKeys = Reflect.ownKeys(brand);
  const inBrandMethods = key => brandMethods.includes(key);
  assert(
    passStyleOf(brand) === REMOTE_STYLE && ownKeys.every(inBrandMethods),
    X`The brand ${brand} doesn't look like a brand. It has these keys: ${ownKeys}`,
  );
};

const assertLooksLikeAmountBrand = amount => {
  const deets = X`The brand in amount ${amount} doesn't look like a brand. Did you pass a value rather than an amount?`;
  assert(typeof amount === 'object', deets);
  const ownKeys = Reflect.ownKeys(amount.brand);
  const inBrandMethods = key => brandMethods.includes(key);
  assert(
    passStyleOf(amount.brand) === REMOTE_STYLE && ownKeys.every(inBrandMethods),
    deets,
  );
};

const assertLooksLikeAmount = amount => {
  assertLooksLikeAmountBrand(amount);
  assertLooksLikeValue(amount.value);
};

/** @type {AmountMath} */
const amountMath = {
  make: (allegedValue, brand) => {
    mustBeComparable(brand);
    assertLooksLikeBrand(brand);
    assertLooksLikeValue(allegedValue);
    const value = getHelpersFromValue(allegedValue).doCoerce(allegedValue);
    const amount = harden({ brand, value });
    return amount;
  },
  coerce: (allegedAmount, brand) => {
    mustBeComparable(brand);
    assertLooksLikeAmount(allegedAmount);
    const { brand: allegedBrand, value } = allegedAmount;
    assert(
      brand === allegedBrand,
      X`The brand in the allegedAmount ${allegedAmount} in 'coerce' didn't match the specified brand ${brand}.`,
    );
    // Will throw on inappropriate value
    return amountMath.make(value, brand);
  },
  getValue: (amount, brand) => {
    assertLooksLikeAmount(amount);
    mustBeComparable(brand);
    return amountMath.coerce(amount, brand).value;
  },
  makeEmpty: (mathKind, brand) => {
    assert(
      helpers[mathKind],
      X`${mathKind} must be MathKind.NAT or MathKind.SET`,
    );
    assertLooksLikeBrand(brand);
    return noCoerceMake(helpers[mathKind].doMakeEmpty(), brand);
  },
  isEmpty: (amount, brand = undefined) => {
    assertLooksLikeAmount(amount);
    optionalBrandCheck(amount, brand);
    return getHelpersFromAmount(amount).doIsEmpty(amount.value);
  },
  isGTE: (leftAmount, rightAmount, brand = undefined) => {
    assertLooksLikeAmount(leftAmount);
    assertLooksLikeAmount(rightAmount);
    optionalBrandCheck(leftAmount, brand);
    optionalBrandCheck(rightAmount, brand);
    assert.equal(leftAmount.brand, rightAmount.brand);
    return getHelpers(leftAmount, rightAmount).doIsGTE(
      leftAmount.value,
      rightAmount.value,
    );
  },
  isEqual: (leftAmount, rightAmount, brand = undefined) => {
    assertLooksLikeAmount(leftAmount);
    assertLooksLikeAmount(rightAmount);
    optionalBrandCheck(leftAmount, brand);
    optionalBrandCheck(rightAmount, brand);
    assert.equal(leftAmount.brand, rightAmount.brand);
    return getHelpers(leftAmount, rightAmount).doIsEqual(
      leftAmount.value,
      rightAmount.value,
    );
  },
  add: (leftAmount, rightAmount, brand = undefined) => {
    assertLooksLikeAmount(leftAmount);
    assertLooksLikeAmount(rightAmount);
    optionalBrandCheck(leftAmount, brand);
    optionalBrandCheck(rightAmount, brand);
    assert.equal(leftAmount.brand, rightAmount.brand);
    return noCoerceMake(
      getHelpers(leftAmount, rightAmount).doAdd(
        leftAmount.value,
        rightAmount.value,
      ),
      leftAmount.brand,
    );
  },
  subtract: (leftAmount, rightAmount, brand = undefined) => {
    assertLooksLikeAmount(leftAmount);
    assertLooksLikeAmount(rightAmount);
    optionalBrandCheck(leftAmount, brand);
    optionalBrandCheck(rightAmount, brand);
    assert.equal(leftAmount.brand, rightAmount.brand);
    return noCoerceMake(
      getHelpers(leftAmount, rightAmount).doSubtract(
        leftAmount.value,
        rightAmount.value,
      ),
      leftAmount.brand,
    );
  },
};
harden(amountMath);

export { amountMath, MathKind };
