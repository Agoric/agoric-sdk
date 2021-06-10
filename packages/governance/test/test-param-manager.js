// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { buildParamManager, ParamType } from '../src/param-manager';

const BASIS_POINTS = 10_000;

test('params one Nat', async t => {
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'number',
      value: 13,
      type: ParamType.NAT,
    },
  ]);
  t.is(publicFacet.lookup('number'), 13);
  manager.update('number', 42);
  t.is(publicFacet.lookup('number'), 42);

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
      message: '18.1 not a safe integer',
    },
    'value should be a nat',
  );
});

test('params one String', async t => {
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'string',
      value: 'foo',
      type: ParamType.STRING,
    },
  ]);
  t.is(publicFacet.lookup('string'), 'foo');
  manager.update('string', 'bar');
  t.is(publicFacet.lookup('string'), 'bar');

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
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'amount',
      value: AmountMath.makeEmpty(brand),
      type: ParamType.AMOUNT,
    },
  ]);
  t.deepEqual(publicFacet.lookup('amount'), AmountMath.makeEmpty(brand));
  manager.update('amount', AmountMath.make(brand, [13]));
  t.deepEqual(publicFacet.lookup('amount'), AmountMath.make(brand, [13]));

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
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'bigint',
      value: 314159n,
      type: ParamType.BIGINT,
    },
  ]);
  t.deepEqual(publicFacet.lookup('bigint'), 314159n);
  manager.update('bigint', 271828182845904523536n);
  t.deepEqual(publicFacet.lookup('bigint'), 271828182845904523536n);

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
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'ratio',
      value: makeRatio(7, brand),
      type: ParamType.RATIO,
    },
  ]);
  t.deepEqual(publicFacet.lookup('ratio'), makeRatio(7, brand));
  manager.update('ratio', makeRatio(701, brand, BASIS_POINTS));
  t.deepEqual(publicFacet.lookup('ratio'), makeRatio(701, brand, BASIS_POINTS));

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
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'brand',
      value: roseBrand,
      type: ParamType.BRAND,
    },
  ]);
  t.deepEqual(publicFacet.lookup('brand'), roseBrand);
  manager.update('brand', thornBrand);
  t.deepEqual(publicFacet.lookup('brand'), thornBrand);

  t.throws(
    () => manager.update('brand', 18.1),
    {
      message: 'value for "brand" must be a brand, was 18.1',
    },
    'value should be a brand',
  );
});

test('params one handle', async t => {
  const fooHandle = makeHandle('foo');
  const barHandle = makeHandle('bar');
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'handle',
      value: fooHandle,
      type: ParamType.HANDLE,
    },
  ]);
  t.deepEqual(publicFacet.lookup('handle'), fooHandle);
  manager.update('handle', barHandle);
  t.deepEqual(publicFacet.lookup('handle'), barHandle);

  t.throws(
    () => manager.update('handle', 18.1),
    {
      message: 'value for "handle" must be an empty object, was 18.1',
    },
    'value for "handle" must be an empty object, was 18.1',
  );
});

test('params one any', async t => {
  const fooHandle = makeHandle('foo');
  const { publicFacet, manager } = buildParamManager([
    {
      name: 'stuff',
      value: fooHandle,
      type: ParamType.ANY,
    },
  ]);
  t.deepEqual(publicFacet.lookup('stuff'), fooHandle);
  manager.update('stuff', 18.1);
  t.deepEqual(publicFacet.lookup('stuff'), 18.1);
});
