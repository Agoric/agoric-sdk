// @ts-check

export {};

/**
 * @typedef {bigint | Infinity} BudgetCost
 */

/**
 * @typedef {object} Budget
 * @property {string} description
 * @property {BudgetCost} maximumPropertyCost the maximum cost of an individual property key
 * @property {BudgetCost} maximumValueCost the maximum cost of an individual value
 * @property {BudgetCost} maximumTotalCost the maximum total cost of the structure
 * @property {BudgetCost} maximumBigIntDigits the maximum number of digits in a bigint
 */

/**
 * @typedef {object} MemoryCostModel
 * @property {string} description
 * @property {bigint} baseCost
 * @property {bigint} bigintPerWordCost cost per 8-byte word
 * @property {bigint} stringPerCharacterCost
 * @property {bigint} objectPerPropertyCost
 */

/**
 * @typedef {(costModel: MemoryCostModel) => Budget} BudgetMaker
 */
