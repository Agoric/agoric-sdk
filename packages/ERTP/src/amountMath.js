/* global harden */
// @ts-check

import { assert, details } from '@agoric/assert';

import { mustBeComparable } from '@agoric/same-structure';
import mathHelpersLib from './mathHelpersLib';

/**
 * @typedef {Object} Amount
 * Amounts are descriptions of digital assets, answering the questions
 * "how much" and "of what kind". Amounts are values labeled with a brand.
 * AmountMath executes the logic of how amounts are changed when digital
 * assets are merged, separated, or otherwise manipulated. For
 * example, a deposit of 2 bucks into a purse that already has 3 bucks
 * gives a new purse balance of 5 bucks. An empty purse has 0 bucks. AmountMath
 * relies heavily on polymorphic MathHelpers, which manipulate the unbranded
 * portion.
 *
 * @property {Brand} brand
 * @property {Value} value
 */

/**
 * @typedef {Object} Value
 * Values describe the value of something that can be owned or shared.
 * Fungible values are normally represented by natural numbers. Other
 * values may be represented as strings naming a particular right, or
 * an arbitrary object that sensibly represents the rights at issue.
 *
 * Value must be Comparable. (This IDL doesn't yet provide a way to specify
 * subtype relationships for structs.)
 */

/**
 * @typedef {Object} AmountMath
 * Logic for manipulating amounts.
 *
 * Amounts are the canonical description of tradable goods. They are manipulated
 * by issuers and mints, and represent the goods and currency carried by purses and
 * payments. They can be used to represent things like currency, stock, and the
 * abstract right to participate in a particular exchange.
 *
 * @property {() => Brand} getBrand Return the brand.
 * @property {() => string} getMathHelpersName
 * Get the name of the mathHelpers used. This can be used as an
 * argument to `makeAmountMath` to create local amountMath.
 *
 * @property {(allegedValue: Value) => Amount} make
 * Make an amount from a value by adding the brand.
 *
 * @property {(allegedAmount: Amount) => Amount} coerce
 * Make sure this amount is valid and return it if so.
 *
 * @property {(amount: Amount) => Value} getValue
 * Extract and return the value.
 *
 * @property {() => Amount} getEmpty
 * Return the amount representing an empty amount. This is the
 * identity element for MathHelpers.add and MatHelpers.subtract.
 *
 * @property {(amount: Amount) => boolean} isEmpty
 * Return true if the Amount is empty. Otherwise false.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isGTE
 * Returns true if the leftAmount is greater than or equal to the
 * rightAmount. For non-scalars, "greater than or equal to" depends
 * on the kind of amount, as defined by the MathHelpers. For example,
 * whether rectangle A is greater than rectangle B depends on whether rectangle
 * A includes rectangle B as defined by the logic in MathHelpers.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isEqual
 * Returns true if the leftAmount equals the rightAmount. We assume
 * that if isGTE is true in both directions, isEqual is also true
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} add
 * Returns a new amount that is the union of both leftAmount and rightAmount.
 *
 * For fungible amount this means adding the values. For other kinds of
 * amount, it usually means including all of the elements from both
 * left and right.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} subtract
 * Returns a new amount that is the leftAmount minus the rightAmount
 * (i.e. everything in the leftAmount that is not in the
 * rightAmount). If leftAmount doesn't include rightAmount
 * (subtraction results in a negative), throw  an error. Because the
 * left amount must include the right amount, this is NOT equivalent
 * to set subtraction.
 */

/**
 * @typedef {Object} Brand
 * The brand identifies the kind of issuer, and has a function to get the
 * alleged name for the kind of asset described. The alleged name (such
 * as 'BTC' or 'moola') is provided by the maker of the issuer and should
 * not be trusted as accurate.
 *
 * Every amount created by AmountMath will have the same brand, but recipients
 * cannot use the brand by itself to verify that a purported amount is
 * authentic, since the brand can be reused by a misbehaving issuer.
 *
 * @property {(issuer: Issuer) => boolean} isMyIssuer
 * @property {() => string} getAllegedName
 */

// Amounts describe digital assets. From an amount, you can learn the
// kind of digital asset as well as "how much" or "how many". Amounts
// have two parts: a brand (the kind of digital asset) and the value
// (the answer to "how much"). For example, in the phrase "5 bucks",
// "bucks" takes the role of the brand and the value is 5. Amounts
// can describe fungible and non-fungible digital assets. Amounts are
// pass-by-copy and can be made by and sent to anyone.

// The issuer has an internal table that maps purses and payments to
// amounts. The issuer must be able to do things such as add digital
// assets to a purse and withdraw digital assets from a purse. To do
// so, it must know how to add and subtract digital assets. Rather
// than hard-coding a particular solution, we chose to parameterize
// the issuer with a collection of polymorphic functions, which we
// call `amountMath`. These math functions include concepts like
// addition, subtraction, and greater than or equal to.

// We also want to make sure there is no confusion as to what kind of
// asset we are using. Thus, amountMath includes checks of the
// `brand`, the unique identifier for the type of digital asset. If
// the wrong brand is used in amountMath, an error is thrown and the
// operation does not succeed.

// amountMath uses mathHelpers to do most of the work, but then adds
// the brand to the result. The function `value` gets the value from
// the amount by removing the brand (amount -> value), and the function
// `make` adds the brand to produce an amount (value -> amount). The
// function `coerce` takes an amount and checks it, returning an amount (amount
// -> amount).

// `makeAmount` takes in a brand and the name of the particular
// mathHelpers to use.

// amountMath is unfortunately not pass-by-copy. If you call
// `getAmountMath` on a remote issuer, it will be a remote object and
// each call will incur the costs of calling a remote object. However,
// you can create a local amountMath by importing this module locally
// and recreating by passing in a brand and an mathHelpers name, both
// of which can be passed-by-copy (since there are no calls to brand
// in this module).

// Each issuer of digital assets has an associated brand in a one-to-one
// mapping. In untrusted contexts, such as in analyzing payments and
// amounts, we can get the brand and find the issuer which matches the
// brand. The issuer and the brand mutually validate each other.

function makeAmountMath(brand, mathHelpersName) {
  mustBeComparable(brand);
  assert.typeof(mathHelpersName, 'string');

  const helpers = mathHelpersLib[mathHelpersName];
  assert(
    helpers !== undefined,
    details`unrecognized mathHelpersName: ${mathHelpersName}`,
  );

  // Cache the amount if we can.
  const cache = new WeakSet();

  const amountMath = harden({
    getBrand: () => brand,
    getMathHelpersName: () => mathHelpersName,

    // Make an amount from a value by adding the brand.
    make: allegedValue => {
      const value = helpers.doCoerce(allegedValue);
      const amount = harden({ brand, value });
      cache.add(amount);
      return amount;
    },

    // Make sure this amount is valid and return it if so.
    coerce: allegedAmount => {
      // If the cache already has the allegedAmount, that
      // means it is a valid amount.
      if (cache.has(allegedAmount)) {
        return allegedAmount;
      }
      const { brand: allegedBrand, value } = allegedAmount;
      assert(
        allegedBrand !== undefined,
        details`alleged brand is undefined. Did you pass a value rather than an amount?`,
      );
      assert(
        brand === allegedBrand,
        details`the brand in the allegedAmount in 'coerce' didn't match the amountMath brand`,
      );
      // Will throw on inappropriate value
      return amountMath.make(value);
    },

    // Get the value from the amount.
    getValue: amount => amountMath.coerce(amount).value,

    // Represents the empty set/mathematical identity.
    // eslint-disable-next-line no-use-before-define
    getEmpty: () => empty,

    // Is the amount equal to the empty set?
    isEmpty: amount => helpers.doIsEmpty(amountMath.getValue(amount)),

    // Is leftAmount greater than or equal to rightAmount? In other
    // words, is everything in the rightAmount included in the
    // leftAmount?
    isGTE: (leftAmount, rightAmount) =>
      helpers.doIsGTE(
        amountMath.getValue(leftAmount),
        amountMath.getValue(rightAmount),
      ),

    // Is leftAmount equal to rightAmount?
    isEqual: (leftAmount, rightAmount) =>
      helpers.doIsEqual(
        amountMath.getValue(leftAmount),
        amountMath.getValue(rightAmount),
      ),

    // Combine leftAmount and rightAmount.
    add: (leftAmount, rightAmount) =>
      amountMath.make(
        helpers.doAdd(
          amountMath.getValue(leftAmount),
          amountMath.getValue(rightAmount),
        ),
      ),

    // Return the amount included in leftAmount but not included in
    // rightAmount. If leftAmount does not include all of rightAmount,
    // error.
    subtract: (leftAmount, rightAmount) =>
      amountMath.make(
        helpers.doSubtract(
          amountMath.getValue(leftAmount),
          amountMath.getValue(rightAmount),
        ),
      ),
  });
  const empty = amountMath.make(helpers.doGetEmpty());
  return amountMath;
}

export default harden(makeAmountMath);
