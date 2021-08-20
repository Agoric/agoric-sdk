// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { buildParamManager, ParamType } from '../src/paramManager.js';

const BASIS_POINTS = 10_000n;

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
  t.deepEqual(getParams()[numberKey].value, 42n);

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
  t.deepEqual(getParams()[stringKey].value, 'bar');

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
      message: 'The brand "[undefined]" doesn\'t look like a brand.',
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
  t.throws(
    () => updateBigint(-1000n),
    {
      message: '-1000 is negative',
    },
    'NAT params must be positive',
  );
});

test('params one ratio', async t => {
  const ratioKey = 'Ratio';
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const ratioDescription = {
    name: ratioKey,
    value: makeRatio(7n, brand),
    type: ParamType.RATIO,
  };
  const { getParams, updateRatio } = buildParamManager([ratioDescription]);
  t.deepEqual(getParams()[ratioKey], ratioDescription);
  updateRatio(makeRatio(701n, brand, BASIS_POINTS));
  t.deepEqual(
    getParams()[ratioKey].value,
    makeRatio(701n, brand, BASIS_POINTS),
  );

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

test('params one instance', async t => {
  const instanceKey = 'Instance';
  // this is sufficient for the current type check. When we add
  // isInstance() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle('Instance');
  const instanceDescription = {
    name: instanceKey,
    value: instanceHandle,
    type: ParamType.INSTANCE,
  };
  const { getParams, updateInstance } = buildParamManager([
    instanceDescription,
  ]);
  t.deepEqual(getParams()[instanceKey], instanceDescription);
  t.throws(
    () => updateInstance(18.1),
    {
      message: 'value for "Instance" must be an Instance, was 18.1',
    },
    'value should be an Instance',
  );
  const handle2 = makeHandle('another Instance');
  updateInstance(handle2);
  t.deepEqual(getParams()[instanceKey].value, handle2);
});

test('params one installation', async t => {
  const installationKey = 'Installation';
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = makeHandle('installation');
  const installationDescription = {
    name: installationKey,
    value: installationHandle,
    type: ParamType.INSTALLATION,
  };
  const { getParams, updateInstallation } = buildParamManager([
    installationDescription,
  ]);
  t.deepEqual(getParams()[installationKey], installationDescription);
  t.throws(
    () => updateInstallation(18.1),
    {
      message: 'value for "Installation" must be an Installation, was 18.1',
    },
    'value should be an installation',
  );
  const handle2 = makeHandle('another installation');
  updateInstallation(handle2);
  t.deepEqual(getParams()[installationKey].value, handle2);
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
    message: 'unrecognized type "quote"',
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
  const constantDescription = {
    name: natKey,
    value: 602214076000000000000000n,
    type: ParamType.NAT,
  };
  const { getParams, updateNat, updateStuff } = buildParamManager([
    cheeseDescription,
    constantDescription,
  ]);
  t.deepEqual(getParams()[stuffKey], cheeseDescription);
  updateStuff(18.1);
  const floatDescription = {
    name: stuffKey,
    value: 18.1,
    type: ParamType.UNKNOWN,
  };
  t.deepEqual(getParams()[stuffKey], floatDescription);
  t.deepEqual(getParams()[natKey], constantDescription);
  t.deepEqual(getParams(), {
    Nat: constantDescription,
    Stuff: floatDescription,
  });
  updateNat(299792458n);
  t.deepEqual(getParams()[natKey].value, 299792458n);
});
