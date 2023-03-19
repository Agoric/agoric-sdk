// @ts-check
import { Fail } from '@agoric/assert';
import { Nat, isNat } from '@endo/nat';

export const stringToNat = s => {
  typeof s === 'string' || Fail`${s} must be a string`;
  const bint = BigInt(s);
  const nat = Nat(bint);
  `${nat}` === s || Fail`${s} must be the canonical representation of ${nat}`;
  return nat;
};

/** @param {{key: string, size: number}[]} queueSizeEntries */
export const parseQueueSizes = queueSizeEntries =>
  Object.fromEntries(
    queueSizeEntries.map(({ key, size }) => {
      typeof key === 'string' || Fail`Key ${key} must be a string`;
      isNat(size) || Fail`Size ${size} is not a positive integer`;
      return [key, size];
    }),
  );

/** @param {Record<string, number>} queueSizes */
export const encodeQueueSizes = queueSizes =>
  Object.entries(queueSizes).map(([key, size]) => {
    isNat(size) || Fail`Size ${size} is not a positive integer`;
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
    Fail`beansPerUnit must be an array, not ${rawBeansPerUnit}`;
  const beansPerUnit = Object.fromEntries(
    rawBeansPerUnit.map(({ key, beans }) => {
      typeof key === 'string' || Fail`Key ${key} must be a string`;
      return [key, stringToNat(beans)];
    }),
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

  return { beansPerUnit, feeUnitPrice, queueMax };
};

export const encodeParams = parsedParams => {
  const { beansPerUnit, feeUnitPrice, queueMax } = parsedParams;

  // eslint-disable-next-line camelcase
  const beans_per_unit = Object.entries(beansPerUnit).map(([key, beans]) => {
    isNat(beans) || Fail`beans ${beans} for ${key} is not a positive integer`;
    return { key, beans: String(beans) };
  });

  Array.isArray(feeUnitPrice) ||
    Fail`feeUnitPrice ${feeUnitPrice} must be an array`;
  // eslint-disable-next-line camelcase
  const fee_unit_price = feeUnitPrice.map(({ denom, amount }) => {
    denom || Fail`denom ${denom} must be non-empty`;
    return { denom, amount: String(amount) };
  });

  // eslint-disable-next-line camelcase
  const queue_max = encodeQueueSizes(queueMax);

  return { beans_per_unit, fee_unit_price, queue_max };
};
