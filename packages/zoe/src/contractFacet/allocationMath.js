// @ts-check
import { AmountMath } from '@agoric/ertp';

import { objectMap } from '../objArrayConversion';

export const addToAllocation = (allocation, amountKeywordRecord) => {
  const allKeywords = Object.keys({ ...allocation, ...amountKeywordRecord });

  const add = (amount, amountToAdd) => {
    if (amount && amountToAdd) {
      return AmountMath.add(amount, amountToAdd);
    }
    return amount || amountToAdd;
  };

  return Object.fromEntries(
    allKeywords.map(keyword => [
      keyword,
      add(allocation[keyword], amountKeywordRecord[keyword]),
    ]),
  );
};

export const subtractFromAllocation = (allocation, amountKeywordRecord) => {
  const subtract = (amount, amountToSubtract) => {
    if (amountToSubtract !== undefined) {
      return AmountMath.subtract(amount, amountToSubtract);
    }
    return amount;
  };

  return objectMap(allocation, ([keyword, allocAmount]) => [
    keyword,
    subtract(allocAmount, amountKeywordRecord[keyword]),
  ]);
};
