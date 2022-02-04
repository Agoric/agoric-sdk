// @ts-check
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';

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

// Map the SwingSet parameters to a deterministic data structure.
export const parseParams = params => {
  const { beans_per_unit: rawBeansPerUnit, fee_unit_price: rawFeeUnitPrice } =
    params;
  assert(
    Array.isArray(rawBeansPerUnit),
    X`beansPerUnit must be an array, not ${rawBeansPerUnit}`,
  );
  const beansPerUnit = Object.fromEntries(
    rawBeansPerUnit.map(({ key, beans }) => {
      assert.typeof(key, 'string', X`Key ${key} must be a string`);
      return [key, stringToNat(beans)];
    }),
  );

  assert(
    Array.isArray(rawFeeUnitPrice),
    X`feeUnitPrice ${rawFeeUnitPrice} must be an array`,
  );
  const feeUnitPrice = rawFeeUnitPrice.map(({ denom, amount }) => {
    assert.typeof(denom, 'string', X`denom ${denom} must be a string`);
    assert(denom, X`denom ${denom} must be non-empty`);
    return { denom, amount: stringToNat(amount) };
  });

  return { beansPerUnit, feeUnitPrice };
};
