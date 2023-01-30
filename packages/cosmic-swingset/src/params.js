// @ts-check
import { assert, details as X } from '@agoric/assert';
import { Nat, isNat } from '@agoric/nat';

export const stringToNat = s => {
  assert.typeof(s, 'string', X`${s} must be a string`);
  const bint = BigInt(s);
  const nat = Nat(bint);
  assert.equal(
    `${nat}`,
    s,
    X`${s} must be the canonical representation of ${nat}`,
  );
  return nat;
};

/** @param {{key: string, size: number}[]} queueSizeEntries */
export const parseQueueSizes = queueSizeEntries =>
  Object.fromEntries(
    queueSizeEntries.map(({ key, size }) => {
      assert.typeof(key, 'string', X`Key ${key} must be a string`);
      assert(isNat(size), X`Size ${size} is not a positive integer`);
      return [key, size];
    }),
  );

/** @param {Record<string, number>} queueSizes */
export const encodeQueueSizes = queueSizes =>
  Object.entries(queueSizes).map(([key, size]) => {
    isNat(size) || assert.fail(X`Size ${size} is not a positive integer`);
    return { key, size };
  });

// Map the SwingSet parameters to a deterministic data structure.
export const parseParams = params => {
  const {
    beans_per_unit: rawBeansPerUnit,
    fee_unit_price: rawFeeUnitPrice,
    queue_max: rawQueueMax,
  } = params;
  Array.isArray(rawBeansPerUnit) ||
    assert.fail(X`beansPerUnit must be an array, not ${rawBeansPerUnit}`);
  const beansPerUnit = Object.fromEntries(
    rawBeansPerUnit.map(({ key, beans }) => {
      assert.typeof(key, 'string', X`Key ${key} must be a string`);
      return [key, stringToNat(beans)];
    }),
  );
  Array.isArray(rawFeeUnitPrice) ||
    assert.fail(X`feeUnitPrice ${rawFeeUnitPrice} must be an array`);
  const feeUnitPrice = rawFeeUnitPrice.map(({ denom, amount }) => {
    assert.typeof(denom, 'string', X`denom ${denom} must be a string`);
    assert(denom, X`denom ${denom} must be non-empty`);
    return { denom, amount: stringToNat(amount) };
  });
  assert(
    Array.isArray(rawQueueMax),
    X`queueMax must be an array, not ${rawQueueMax}`,
  );
  const queueMax = parseQueueSizes(rawQueueMax);

  return { beansPerUnit, feeUnitPrice, queueMax };
};
