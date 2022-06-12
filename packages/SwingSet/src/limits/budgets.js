// @ts-check

import {
  MAX_NORMAL_INPUT_BYTES,
  MAX_SOURCE_BUNDLE_BYTES,
  MAX_VAT_MESSAGE_BYTES,
  MAX_BIGINT_DIGITS,
} from './constants.js';

/** @typedef {import('./types.js').Budget} Budget */
/** @typedef {import('./types.js').BudgetCost} BudgetCost */

/** @type {Record<string, Budget>} */
const ALL_BUDGETS = {};

/**
 * @param {string} name
 * @param {Budget} budget
 */
const registerBudget = (name, budget) => {
  ALL_BUDGETS[name] = harden(budget);
  return budget;
};

/** @type {Budget} */
export const ZERO_BUDGET = registerBudget('ZERO_BUDGET', {
  description: 'no tolerance for cost',
  maximumPropertyCost: 0,
  maximumTotalCost: 0,
  maximumValueCost: 0,
  maximumBigIntDigits: 0,
});

export const NORMAL_INPUT_BUDGET = registerBudget('NORMAL_INPUT_BUDGET', {
  description: 'normal input',
  maximumPropertyCost: 512,
  maximumTotalCost: MAX_NORMAL_INPUT_BYTES,
  maximumValueCost: MAX_NORMAL_INPUT_BYTES,
  maximumBigIntDigits: MAX_BIGINT_DIGITS,
});

/** @type {Budget} */
export const SOURCE_BUNDLE_BUDGET = registerBudget('SOURCE_BUNDLE_BUDGET', {
  description: 'source bundle',
  maximumPropertyCost: 32,
  maximumTotalCost: MAX_SOURCE_BUNDLE_BYTES,
  maximumValueCost: MAX_SOURCE_BUNDLE_BYTES,
  maximumBigIntDigits: MAX_BIGINT_DIGITS,
});

/** @type {Budget} */
export const VAT_MESSAGE_BUDGET = registerBudget('VAT_MESSAGE_BUDGET', {
  description: 'vat message',
  maximumPropertyCost: 512,
  maximumValueCost: MAX_VAT_MESSAGE_BYTES,
  maximumTotalCost: MAX_VAT_MESSAGE_BYTES,
  maximumBigIntDigits: MAX_BIGINT_DIGITS,
});

/**
 * @template {keyof Budget} K
 * @param {K} prop
 */
const maxBudgetProperty = prop =>
  Object.values(ALL_BUDGETS).reduce((prior, budget) => {
    const current = budget[prop];
    if (prior >= current) {
      return prior;
    }
    return current;
  }, ZERO_BUDGET[prop]);

export const MAXIMUM_BUDGET = registerBudget('MAXIMUM_BUDGET', {
  description: 'maximum finite budget',
  maximumPropertyCost: maxBudgetProperty('maximumPropertyCost'),
  maximumValueCost: maxBudgetProperty('maximumValueCost'),
  maximumTotalCost: maxBudgetProperty('maximumTotalCost'),
  maximumBigIntDigits: maxBudgetProperty('maximumBigIntDigits'),
});

export const UNLIMITED_BUDGET = registerBudget('UNLIMITED_BUDGET', {
  description: 'unlimited',
  maximumPropertyCost: Infinity,
  maximumValueCost: Infinity,
  maximumTotalCost: Infinity,
  maximumBigIntDigits: Infinity,
});

harden(ALL_BUDGETS);
export { ALL_BUDGETS };
