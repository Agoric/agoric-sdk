// @ts-check
// @jessie-check

import { X, Fail, makeError } from '@endo/errors';
import { Nat, isNat } from '@endo/nat';

/**
 * @template {number | bigint} T
 * @param {T} n
 * @returns {T}
 */
const requireNat = n => (isNat(n) ? n : Fail`${n} must be a positive integer`);

/**
 * @param {string} s
 * @returns {bigint}
 */
export const stringToNat = s => {
  typeof s === 'string' || Fail`${s} must be a string`;
  const bint = BigInt(s);
  const nat = Nat(bint);
  `${nat}` === s || Fail`${s} must be the canonical representation of ${nat}`;
  return nat;
};

/**
 * @template T
 * @template U
 * @param {Array<[key: string, value: T]>} entries
 * @param {(value: T) => U} [mapper]
 */
const recordFromEntries = (
  entries,
  mapper = x => /** @type {U} */ (/** @type {unknown} */ (x)),
) =>
  Object.fromEntries(
    entries.map(([key, value]) => {
      typeof key === 'string' || Fail`Key ${key} must be a string`;
      try {
        return [key, mapper(value)];
      } catch (err) {
        throw makeError(X`${key} value was invalid`, undefined, { cause: err });
      }
    }),
  );

export const parseQueueSizes = entryRecords =>
  recordFromEntries(
    entryRecords.map(({ key, size }) => [key, size]),
    requireNat,
  );

/** @param {Record<string, number>} queueSizes */
export const encodeQueueSizes = queueSizes =>
  Object.entries(queueSizes).map(([key, size]) => {
    isNat(size) || Fail`Size ${size} is not a positive integer`;
    return { key, size };
  });

/**
 * Map the SwingSet parameters to a deterministic data structure.
 * @param {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType} params
 */
export const parseParams = params => {
  const {
    beans_per_unit: rawBeansPerUnit,
    fee_unit_price: rawFeeUnitPrice,
    queue_max: rawQueueMax,
    vat_cleanup_budget: rawVatCleanupBudget,
  } = params;

  Array.isArray(rawBeansPerUnit) ||
    Fail`beansPerUnit must be an array, not ${rawBeansPerUnit}`;
  const beansPerUnit = recordFromEntries(
    rawBeansPerUnit.map(({ key, beans }) => [key, beans]),
    stringToNat,
  );

  Array.isArray(rawFeeUnitPrice) ||
    Fail`feeUnitPrice ${rawFeeUnitPrice} must be an array`;
  const feeUnitPrice = rawFeeUnitPrice.map(({ denom, amount }) => {
    typeof denom === 'string' || Fail`denom ${denom} must be a string`;
    denom || Fail`denom ${denom} must be non-empty`;
    return { denom, amount: stringToNat(amount) };
  });

  Array.isArray(rawQueueMax) ||
    Fail`queueMax must be an array, not ${rawQueueMax}`;
  const queueMax = parseQueueSizes(rawQueueMax);

  Array.isArray(rawVatCleanupBudget) ||
    Fail`vatCleanupBudget must be an array, not ${rawVatCleanupBudget}`;
  const vatCleanupBudget = recordFromEntries(
    rawVatCleanupBudget.map(({ key, value }) => [key, value]),
    s => Number(stringToNat(s)),
  );
  rawVatCleanupBudget.length === 0 ||
    vatCleanupBudget.default !== undefined ||
    Fail`vatCleanupBudget.default must be provided when vatCleanupBudget is not empty`;

  return { beansPerUnit, feeUnitPrice, queueMax, vatCleanupBudget };
};
