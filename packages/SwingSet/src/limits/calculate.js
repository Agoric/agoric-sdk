// @ts-check

import { isObject } from '@endo/marshal';

/** @typedef {import('./types').Budget} Budget */
/** @typedef {import('./types').BudgetCost} BudgetCost */
/** @typedef {import('./types').MemoryCostModel} MemoryCostModel */

const { details: X } = assert;
// @ts-expect-error verbatim is not defined
const v = assert.verbatim || assert.quote;

/**
 * @param {BudgetCost} cost
 * @param {string} [description]
 */
export const assertIsBudgetCost = (cost, description = 'budget cost') => {
  assert.typeof(cost, 'number', X`${v(description)} ${cost} must be a number`);
  assert(cost >= 0, X`${v(description)} ${cost} must be nonnegative`);
};

/**
 * @param {MemoryCostModel} costModel
 */
export const makeCalculateCost = costModel => {
  assert.typeof(
    costModel,
    'object',
    X`costModel ${costModel} must be an object`,
  );
  const {
    baseValueBytes,
    bytesPerBigintDigit,
    bytesPerStringCharacter,
    bytesPerObjectProperty,
  } = costModel;
  assertIsBudgetCost(baseValueBytes, 'baseValueBytes');
  assertIsBudgetCost(bytesPerBigintDigit, 'bytesPerBigintDigit');
  assertIsBudgetCost(bytesPerStringCharacter, 'bytesPerStringCharacter');
  assertIsBudgetCost(bytesPerObjectProperty, 'bytesPerObjectProperty');

  let totalCost = 0;
  const getTotalCost = () => totalCost;

  /**
   * @param {unknown} value
   */
  const shallowCost = value => {
    let cost = baseValueBytes;
    if (isObject(value)) {
      /**
       * Either a function or an object with properties.
       *
       * @type {{ [x: PropertyKey]: PropertyDescriptor }}
       */
      const descs = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descs);
      cost += keys.length * bytesPerObjectProperty;
      totalCost += cost;
      return cost;
    }
    // We have a primitive.
    switch (typeof value) {
      case 'string': {
        // The size of the string, in approximate bytes.
        cost += value.length * bytesPerStringCharacter;
        break;
      }
      case 'bigint': {
        // Compute the number of digits in the bigint.
        const digits = `${value}`;
        cost += digits.length * bytesPerBigintDigit;
        break;
      }
      case 'object': {
        assert.equal(
          value,
          null,
          X`internal error; non-null objects should have been already handled`,
        );
        // Base cost covers it.
        break;
      }
      case 'boolean':
      case 'undefined':
      case 'number':
      case 'symbol': {
        // Base cost covers it.
        break;
      }
      default: {
        assert.fail(X`internal error; unrecognized type ${typeof value}`);
      }
    }
    totalCost += cost;
    return cost;
  };
  return { shallowCost, getTotalCost };
};

/**
 * @param {Budget} budget
 * @param {MemoryCostModel} costModel
 */
export const makeBudgetValidator = (budget, costModel) => {
  const { shallowCost, getTotalCost } = makeCalculateCost(costModel);
  const {
    description,
    maximumPropertyCost,
    maximumValueCost,
    maximumTotalCost,
    maximumBigIntDigits,
  } = budget;

  /**
   * @param {unknown} value
   * @param {string} context
   */
  const assertRange = (value, context) => {
    if (typeof value !== 'bigint') {
      // It's not a bigint.
      return;
    }
    const digits = `${value}`;
    const numDigits = digits[0] === '-' ? digits.length - 1 : digits.length;
    assert(
      numDigits <= maximumBigIntDigits,
      X`${v(
        context,
      )} ${value} number of digits ${numDigits} exceeds maximum bigint digits ${maximumBigIntDigits}`,
      RangeError,
    );
  };

  /**
   * @param {PropertyKey} key
   * @param {unknown} value
   * @returns {any}
   */
  return (key, value) => {
    try {
      assertRange(key, 'key');
      const keyCost = shallowCost(key);
      assert(
        keyCost <= maximumPropertyCost,
        X`key cost ${keyCost} exceeds ${v(
          description,
        )} maximum property cost ${maximumPropertyCost}`,
        RangeError,
      );

      assertRange(value, 'value');
      const valueCost = shallowCost(value);
      assert(
        valueCost <= maximumValueCost,
        X`value cost ${valueCost} exceeds ${v(
          description,
        )} maximum value cost ${maximumValueCost}`,
        RangeError,
      );

      const totalCost = getTotalCost();
      assert(
        totalCost <= maximumTotalCost,
        X`total cost ${totalCost} exceeds ${v(
          description,
        )} maximum total cost ${maximumTotalCost}`,
        RangeError,
      );

      return value;
    } catch (err) {
      assert.note(
        err,
        X`while using ${costModel} to validate key ${key} value ${value} is within ${budget}`,
      );
      throw err;
    }
  };
};
