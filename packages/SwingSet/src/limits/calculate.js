// @ts-check

/** @typedef {import('./types').Budget} Budget */
/** @typedef {import('./types').MemoryCostModel} MemoryCostModel */

const { details: X } = assert;
// @ts-expect-error verbatim is not defined
const v = assert.verbatim || assert.quote;

export const BIGINT_WORD_VALUE = 256n ** 8n;

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
    baseCost,
    bigintPerWordCost,
    stringPerCharacterCost,
    objectPerPropertyCost,
  } = costModel;
  assert.typeof(baseCost, 'bigint', X`baseCost ${baseCost} must be a bigint`);
  assert.typeof(
    bigintPerWordCost,
    'bigint',
    X`bigintPerWordCost ${bigintPerWordCost} must be a bigint`,
  );
  assert.typeof(
    stringPerCharacterCost,
    'bigint',
    X`stringPerCharacterCost ${stringPerCharacterCost} must be a bigint`,
  );
  assert.typeof(
    objectPerPropertyCost,
    'bigint',
    X`objectPerPropertyCost ${objectPerPropertyCost} must be a bigint`,
  );

  let totalCost = 0n;
  const getTotalCost = () => totalCost;

  /**
   * @param {unknown} value
   */
  const shallowCost = value => {
    let cost = baseCost;
    if (Object(value) === value) {
      /**
       * Either a function or an object with properties.
       *
       * @type {{ [x: PropertyKey]: PropertyDescriptor }}
       */
      const descs = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descs);
      cost += BigInt(keys.length) * objectPerPropertyCost;
      totalCost += cost;
      return cost;
    }
    // We have a primitive.
    switch (typeof value) {
      case 'string': {
        // The size of the string, in approximate bytes.
        cost += BigInt(value.length) * stringPerCharacterCost;
        break;
      }
      case 'bigint': {
        // Compute the number of approximate bytes in the bigint.
        let remaining = value;
        if (remaining < 0n) {
          remaining = -remaining;
        }
        // Count number of bigint chunk and multiply out.
        while (remaining > 0n) {
          remaining /= BIGINT_WORD_VALUE;
          cost += bigintPerWordCost;
        }
        // Round up.
        cost += bigintPerWordCost;
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
    if (typeof maximumBigIntDigits !== 'bigint') {
      // It's Infinity.
      return;
    }
    if (typeof value !== 'bigint') {
      return;
    }
    const absVal = value < 0n ? -value : value;
    assert(
      absVal <= 10n ** maximumBigIntDigits,
      X`${v(
        context,
      )} ${value} exceeds maximum bigint digits ${maximumBigIntDigits}`,
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
