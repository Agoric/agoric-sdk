// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { buildParamManager, ParamType } from '../src/paramManager';

const BASIS_POINTS = 10_000;

test('params one Nat', async t => {
  const numberKey = 'Number';
  const numberDescription = {
    name: numberKey,
    value: 13n,
    type: ParamType.NAT,
  };
  const { getParams, updateNumber } = buildParamManager([numberDescription]);
  t.deepEqual(getParams()[numberKey], numberDescription);
  updateNumber(42n);
  t.is(getParams()[numberKey].value, 42n);

  t.throws(
    () => updateNumber(18.1),
    {
      message: '18.1 must be a bigint',
    },
    'value should be a nat',
  );
  t.throws(
    () => updateNumber(13),
    {
      message: '13 must be a bigint',
    },
    'must be bigint',
  );
});

test('params one String', async t => {
  const stringKey = 'String';
  const stringDescription = {
    name: stringKey,
    value: 'foo',
    type: ParamType.STRING,
  };
  const { getParams, updateString } = buildParamManager([stringDescription]);
  t.deepEqual(getParams()[stringKey], stringDescription);
  updateString('bar');
  t.is(getParams()[stringKey].value, 'bar');

  t.throws(
    () => updateString(18.1),
    {
      message: '18.1 must be a string',
    },
    'value should be a string',
  );
});

test('params one Amount', async t => {
  const amountKey = 'Amount';
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const amountDescription = {
    name: amountKey,
    value: AmountMath.makeEmpty(brand),
    type: ParamType.AMOUNT,
  };
  const { getParams, updateAmount } = buildParamManager([amountDescription]);
  t.deepEqual(getParams()[amountKey], amountDescription);
  updateAmount(AmountMath.make(brand, [13]));
  t.deepEqual(getParams()[amountKey].value, AmountMath.make(brand, [13]));

  t.throws(
    () => updateAmount(18.1),
    {
      message:
        "The amount 18.1 doesn't look like an amount. Did you pass a value instead?",
    },
    'value should be a amount',
  );
});

test('params one BigInt', async t => {
  const bigintKey = 'Bigint';
  const bigIntDescription = {
    name: bigintKey,
    value: 314159n,
    type: ParamType.NAT,
  };
  const { getParams, updateBigint } = buildParamManager([bigIntDescription]);
  t.deepEqual(getParams()[bigintKey], bigIntDescription);
  updateBigint(271828182845904523536n);
  t.deepEqual(getParams()[bigintKey].value, 271828182845904523536n);

  t.throws(
    () => updateBigint(18.1),
    {
      message: '18.1 must be a bigint',
    },
    'value should be a bigint',
  );
});

test('params one ratio', async t => {
  const ratioKey = 'Ratio';
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const ratioDescription = {
    name: ratioKey,
    value: makeRatio(7, brand),
    type: ParamType.RATIO,
  };
  const { getParams, updateRatio } = buildParamManager([ratioDescription]);
  t.deepEqual(getParams()[ratioKey], ratioDescription);
  updateRatio(makeRatio(701, brand, BASIS_POINTS));
  t.deepEqual(getParams()[ratioKey].value, makeRatio(701, brand, BASIS_POINTS));

  t.throws(
    () => updateRatio(18.1),
    {
      message: 'Ratio 18.1 must be a record with 2 fields.',
    },
    'value should be a ratio',
  );
});

test('params one brand', async t => {
  const brandKey = 'Brand';
  const { brand: roseBrand } = makeIssuerKit('roses', AssetKind.SET);
  const { brand: thornBrand } = makeIssuerKit('thorns');
  const brandDescription = {
    name: brandKey,
    value: roseBrand,
    type: ParamType.BRAND,
  };
  const { getParams, updateBrand } = buildParamManager([brandDescription]);
  t.deepEqual(getParams()[brandKey], brandDescription);
  updateBrand(thornBrand);
  t.deepEqual(getParams()[brandKey].value, thornBrand);

  t.throws(
    () => updateBrand(18.1),
    {
      message: 'value for "Brand" must be a brand, was 18.1',
    },
    'value should be a brand',
  );
});

test('params one unknown', async t => {
  const stuffKey = 'Stuff';
  const { brand: stiltonBrand } = makeIssuerKit('stilton', AssetKind.SET);
  const stuffDescription = {
    name: stuffKey,
    value: stiltonBrand,
    type: ParamType.UNKNOWN,
  };
  const { getParams, updateStuff } = buildParamManager([stuffDescription]);
  t.deepEqual(getParams()[stuffKey], stuffDescription);
  updateStuff(18.1);
  t.deepEqual(getParams()[stuffKey].value, 18.1);
});

test('params duplicate entry', async t => {
  const stuffKey = 'Stuff';
  const { brand: stiltonBrand } = makeIssuerKit('stilton', AssetKind.SET);
  t.throws(
    () =>
      buildParamManager([
        {
          name: stuffKey,
          value: 37n,
          type: ParamType.NAT,
        },
        {
          name: stuffKey,
          value: stiltonBrand,
          type: ParamType.UNKNOWN,
        },
      ]),
    {
      message: `each parameter name must be unique: "Stuff" duplicated`,
    },
  );
});

test('params unknown type', async t => {
  const stuffKey = 'Stuff';
  const stuffDescription = {
    name: stuffKey,
    value: 'It was the best of times, it was the worst of times',
    type: 'quote',
  };
  // @ts-ignore  illegal value for testing
  t.throws(() => buildParamManager([stuffDescription]), {
    message: 'unknown type guard "quote"',
  });
});

test('params multiple values', t => {
  const stuffKey = 'Stuff';
  const natKey = 'Nat';
  const { brand: parmesanBrand } = makeIssuerKit('parmesan', AssetKind.SET);
  const cheeseDescription = {
    name: stuffKey,
    value: parmesanBrand,
    type: ParamType.UNKNOWN,
  };
  const piDescription = {
    name: natKey,
    value: 314159n,
    type: ParamType.NAT,
  };
  const { getParams, updateNat: _updateNat, updateStuff } = buildParamManager([
    cheeseDescription,
    piDescription,
  ]);
  t.deepEqual(getParams()[stuffKey], cheeseDescription);
  updateStuff(18.1);
  const floatDescription = {
    name: stuffKey,
    value: 18.1,
    type: ParamType.UNKNOWN,
  };
  t.deepEqual(getParams()[stuffKey], floatDescription);
  t.deepEqual(getParams()[natKey], piDescription);
  t.deepEqual(getParams(), { Nat: piDescription, Stuff: floatDescription });
});
