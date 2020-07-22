// @ts-check

import { assert, details } from '@agoric/assert';

import { mustBeComparable } from '@agoric/same-structure';
import mathHelpersLib from './mathHelpersLib';

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
