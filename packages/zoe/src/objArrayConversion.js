import { assert, details, openDetail } from '@agoric/assert';

export const arrayToObj = (array, keywords) => {
  assert(
    array.length === keywords.length,
    details`array and keywords must be of equal length`,
  );
  const obj = {};
  keywords.forEach((keyword, i) => (obj[keyword] = array[i]));
  return obj;
};

export const objToArray = (obj, keywords) => {
  const keys = Object.getOwnPropertyNames(obj);
  assert(
    keys.length === keywords.length,
    details`object keys (${openDetail(keys)}) and keywords (${openDetail(
      keywords,
    )}) must be of equal length`,
  );
  return keywords.map(keyword => obj[keyword]);
};

export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    assert(
      whole.includes(key),
      details`key ${openDetail(
        key,
      )} was not one of the expected keys (${openDetail(whole.join(', '))})`,
    );
  });
};

// Keywords must equal the keys of obj
export const objToArrayAssertFilled = (obj, keywords) => {
  const keys = Object.getOwnPropertyNames(obj);
  assert(
    keys.length === keywords.length,
    details`object keys (${openDetail(keys)}) and keywords (${openDetail(
      keywords,
    )}) must be of equal length`,
  );
  assertSubset(keywords, keys);
  // ensure all keywords are defined on obj
  return keywords.map(keyword => {
    assert(
      obj[keyword] !== undefined,
      details`obj[keyword] must be defined for keyword ${openDetail(keyword)}`,
    );
    return obj[keyword];
  });
};

// return a new object with only the keys in subsetKeywords. `obj`
// must have values for all the `subsetKeywords`.
export const filterObj = /** @type {function<T>(T, string[]): T} */ (
  obj,
  subsetKeywords,
) => {
  const newObj = {};
  subsetKeywords.forEach(keyword => {
    assert(
      obj[keyword] !== undefined,
      details`obj[keyword] must be defined for keyword ${openDetail(keyword)}`,
    );
    newObj[keyword] = obj[keyword];
  });
  return newObj;
};

// return a new object with only the keys in subsetKeywords. `obj`
// may *not* have all the `subsetKeywords`.
export const filterObjOkIfMissing = /** @type {function<T>(T, string[]): T} */ (
  obj,
  subsetKeywords,
) => {
  const newObj = {};
  subsetKeywords.forEach(keyword => {
    if (obj[keyword] !== undefined) {
      newObj[keyword] = obj[keyword];
    }
  });
  return newObj;
};

/**
 * @typedef {import('./zoe').Allocation} Allocation
 * @typedef {import('@agoric/ertp/src/amountMath').AmountMath} AmountMath
 * @typedef {{[Keyword:string]:AmountMath}} KeywordAmountMathRecord
 */

// return a new object with only the keys in subsetKeywords, but fill
// in empty amounts for any key that is undefined in the original obj
export const filterFillAmounts = /** @type {function(Allocation, string[], KeywordAmountMathRecord):Allocation} */ (
  obj,
  subsetKeywords,
  amountMathKeywordRecord,
) => {
  const newObj = {};
  subsetKeywords.forEach(keyword => {
    if (obj[keyword] === undefined) {
      newObj[keyword] = amountMathKeywordRecord[keyword].getEmpty();
    } else {
      newObj[keyword] = obj[keyword];
    }
  });
  return newObj;
};
