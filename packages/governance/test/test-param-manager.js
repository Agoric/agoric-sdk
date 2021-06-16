// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { buildParamManager, ParamType } from '../src/paramManager';

const BASIS_POINTS = 10_000;

test('params one Nat', async t => {
  const { params, manager } = buildParamManager([
    {
      name: 'number',
      value: 13n,
      type: ParamType.NAT,
    },
  ]);
  t.is(params.lookup('number'), 13n);
  manager.update('number', 42n);
  t.is(params.lookup('number'), 42n);

  t.throws(
    () => manager.update('string', 'foo'),
    {
      message: '"name" not found: "string"',
    },
    '"string" was not a registered name',
  );
  t.throws(
    () => manager.update('number', 18.1),
    {
      message: '18.1 must be a bigint',
    },
    'value should be a nat',
  );
  t.throws(
    () => manager.update('number', 13),
    {
      message: '13 must be a bigint',
    },
    'must be bigint',
  );
});

test('params one String', async t => {
  const { params, manager } = buildParamManager([
    {
      name: 'string',
      value: 'foo',
      type: ParamType.STRING,
    },
  ]);
  t.is(params.lookup('string'), 'foo');
  manager.update('string', 'bar');
  t.is(params.lookup('string'), 'bar');

  t.throws(
    () => manager.update('number', 'foo'),
    {
      message: '"name" not found: "number"',
    },
    '"number" was not a registered name',
  );
  t.throws(
    () => manager.update('string', 18.1),
    {
      message: '18.1 must be a string',
    },
    'value should be a string',
  );
});

test('params one Amount', async t => {
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const { params, manager } = buildParamManager([
    {
      name: 'amount',
      value: AmountMath.makeEmpty(brand),
      type: ParamType.AMOUNT,
    },
  ]);
  t.deepEqual(params.lookup('amount'), AmountMath.makeEmpty(brand));
  manager.update('amount', AmountMath.make(brand, [13]));
  t.deepEqual(params.lookup('amount'), AmountMath.make(brand, [13]));

  t.throws(
    () => manager.update('number', 13),
    {
      message: '"name" not found: "number"',
    },
    '"number" was not a registered name',
  );

  t.throws(
    () => manager.update('amount', 18.1),
    {
      message:
        "The amount 18.1 doesn't look like an amount. Did you pass a value instead?",
    },
    'value should be a amount',
  );
});

test('params one BigInt', async t => {
  const { params, manager } = buildParamManager([
    {
      name: 'bigint',
      value: 314159n,
      type: ParamType.NAT,
    },
  ]);
  t.deepEqual(params.lookup('bigint'), 314159n);
  manager.update('bigint', 271828182845904523536n);
  t.deepEqual(params.lookup('bigint'), 271828182845904523536n);

  t.throws(
    () => manager.update('bigint', 18.1),
    {
      message: '18.1 must be a bigint',
    },
    'value should be a bigint',
  );
});

test('params one ratio', async t => {
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const { params, manager } = buildParamManager([
    {
      name: 'ratio',
      value: makeRatio(7, brand),
      type: ParamType.RATIO,
    },
  ]);
  t.deepEqual(params.lookup('ratio'), makeRatio(7, brand));
  manager.update('ratio', makeRatio(701, brand, BASIS_POINTS));
  t.deepEqual(params.lookup('ratio'), makeRatio(701, brand, BASIS_POINTS));

  t.throws(
    () => manager.update('ratio', 18.1),
    {
      message: 'Ratio 18.1 must be a record with 2 fields.',
    },
    'value should be a ratio',
  );
});

test('params one brand', async t => {
  const { brand: roseBrand } = makeIssuerKit('roses', AssetKind.SET);
  const { brand: thornBrand } = makeIssuerKit('thorns');
  const { params, manager } = buildParamManager([
    {
      name: 'brand',
      value: roseBrand,
      type: ParamType.BRAND,
    },
  ]);
  t.deepEqual(params.lookup('brand'), roseBrand);
  manager.update('brand', thornBrand);
  t.deepEqual(params.lookup('brand'), thornBrand);

  t.throws(
    () => manager.update('brand', 18.1),
    {
      message: 'value for "brand" must be a brand, was 18.1',
    },
    'value should be a brand',
  );
});

test('params one any', async t => {
  const { brand: stiltonBrand } = makeIssuerKit('stilton', AssetKind.SET);
  const { params, manager } = buildParamManager([
    {
      name: 'stuff',
      value: stiltonBrand,
      type: ParamType.ANY,
    },
  ]);
  t.deepEqual(params.lookup('stuff'), stiltonBrand);
  manager.update('stuff', 18.1);
  t.deepEqual(params.lookup('stuff'), 18.1);
});

test('params keys', async t => {
  const { brand: parmesanBrand } = makeIssuerKit('parmesan', AssetKind.SET);
  const { params, manager } = buildParamManager([
    {
      name: 'stuff',
      value: parmesanBrand,
      type: ParamType.ANY,
    },
    {
      name: 'nat',
      value: 314159n,
      type: ParamType.NAT,
    },
  ]);
  t.deepEqual(params.lookup('stuff'), parmesanBrand);
  manager.update('stuff', 18.1);
  t.deepEqual(params.lookup('stuff'), 18.1);

  t.deepEqual(params.getDetails('stuff'), {
    name: 'stuff',
    value: 18.1,
    type: ParamType.ANY,
  });
  t.deepEqual(params.getDetails('nat'), {
    name: 'nat',
    value: 314159n,
    type: ParamType.NAT,
  });
  t.deepEqual(params.definedNames(), ['stuff', 'nat']);
});
