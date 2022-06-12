// This file corresponds to golang/cosmos/x/swingset/types/limits.go
// @ts-check

import {
  NORMAL_INPUT_BUDGET,
  VAT_MESSAGE_BUDGET,
  SOURCE_BUNDLE_BUDGET,
} from './budgets.js';
import { MAXIMUM_COST_MODEL } from './cost-models.js';
import { makeBudgetValidator } from './calculate.js';
import { detectLocalMemoryCostModel } from './detect.js';

/** @typedef {import('./types').Budget} Budget */
/** @typedef {import('./types').BudgetCost} BudgetCost */
/** @typedef {import('./types').MemoryCostModel} MemoryCostModel */

/**
 * @param {Partial<Budget> | BudgetCost } [budgetTemplate]
 * @param {MemoryCostModel} [costModel]
 */
export const makeInputValidator = (
  budgetTemplate,
  costModel = MAXIMUM_COST_MODEL,
) => {
  /**
   * @param {Exclude<keyof Budget, 'description'>} prop
   */
  const defaultCost = prop => {
    if (prop !== 'maximumPropertyCost' && typeof budgetTemplate === 'bigint') {
      return budgetTemplate;
    }
    // Use the value from the "normal" input budget.
    return NORMAL_INPUT_BUDGET[prop];
  };

  // Fill in the costs.
  const {
    description = 'custom',
    maximumPropertyCost = defaultCost('maximumPropertyCost'),
    maximumValueCost = defaultCost('maximumValueCost'),
    maximumTotalCost = defaultCost('maximumTotalCost'),
    maximumBigIntDigits = defaultCost('maximumBigIntDigits'),
  } = typeof budgetTemplate === 'object' ? budgetTemplate : {};

  /** @type {Budget} */
  const budget = harden({
    description,
    maximumPropertyCost,
    maximumValueCost,
    maximumTotalCost,
    maximumBigIntDigits,
  });
  return makeBudgetValidator(budget, costModel);
};

export const makeVatMessageValidator = (costModel = MAXIMUM_COST_MODEL) =>
  makeBudgetValidator(VAT_MESSAGE_BUDGET, costModel);

export const makeSourceBundleValidator = (costModel = MAXIMUM_COST_MODEL) =>
  makeBudgetValidator(SOURCE_BUNDLE_BUDGET, costModel);

export const limitedParse = value => JSON.parse(value, makeInputValidator());
export const limitedStringify = value =>
  JSON.stringify(value, makeInputValidator());
