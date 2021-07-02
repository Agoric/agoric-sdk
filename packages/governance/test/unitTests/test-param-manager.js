// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { buildParamManager, ParamType } from '../../src/paramManager';
import { makeParamChangePositions } from '../../src/governParam';

const BASIS_POINTS = 10_000;

test('params one Nat', async t => {
  const numberKey = 'Number';
  const numberDescription = {
    name: numberKey,
    value: 13n,
    type: ParamType.NAT,
  };
  const { getParam, updateNumber } = buildParamManager([numberDescription]);
  t.deepEqual(getParam(numberKey), numberDescription);
  updateNumber(42n);
  t.deepEqual(getParam(numberKey).value, 42n);

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
  const { getParam, updateString } = buildParamManager([stringDescription]);
  t.deepEqual(getParam(stringKey), stringDescription);
  updateString('bar');
  t.deepEqual(getParam(stringKey).value, 'bar');

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
  const { getParam, updateAmount } = buildParamManager([amountDescription]);
  t.deepEqual(getParam(amountKey), amountDescription);
  updateAmount(AmountMath.make(brand, [13]));
  t.deepEqual(getParam(amountKey).value, AmountMath.make(brand, [13]));

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
  const { getParam, updateBigint } = buildParamManager([bigIntDescription]);
  t.deepEqual(getParam(bigintKey), bigIntDescription);
  updateBigint(271828182845904523536n);
  t.deepEqual(getParam(bigintKey).value, 271828182845904523536n);

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
    value: makeRatio(7, brand),
    type: ParamType.RATIO,
  };
  const { getParam, updateRatio } = buildParamManager([ratioDescription]);
  t.deepEqual(getParam(ratioKey), ratioDescription);
  updateRatio(makeRatio(701, brand, BASIS_POINTS));
  t.deepEqual(getParam(ratioKey).value, makeRatio(701, brand, BASIS_POINTS));

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
  const { getParam, updateBrand } = buildParamManager([brandDescription]);
  t.deepEqual(getParam(brandKey), brandDescription);
  updateBrand(thornBrand);
  t.deepEqual(getParam(brandKey).value, thornBrand);

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
  const { getParam, updateStuff } = buildParamManager([stuffDescription]);
  t.deepEqual(getParam(stuffKey), stuffDescription);
  updateStuff(18.1);
  t.deepEqual(getParam(stuffKey).value, 18.1);
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
  const { getParam, updateInstance } = buildParamManager([instanceDescription]);
  t.deepEqual(getParam(instanceKey), instanceDescription);
  t.throws(
    () => updateInstance(18.1),
    {
      message: 'value for "Instance" must be an Instance, was 18.1',
    },
    'value should be an Instance',
  );
  const handle2 = makeHandle('another Instance');
  updateInstance(handle2);
  t.deepEqual(getParam(instanceKey).value, handle2);
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
  const { getParam, updateInstallation } = buildParamManager([
    installationDescription,
  ]);
  t.deepEqual(getParam(installationKey), installationDescription);
  t.throws(
    () => updateInstallation(18.1),
    {
      message: 'value for "Installation" must be an Installation, was 18.1',
    },
    'value should be an installation',
  );
  const handle2 = makeHandle('another installation');
  updateInstallation(handle2);
  t.deepEqual(getParam(installationKey).value, handle2);
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
  const { getParams, getParam, updateNat, updateStuff } = buildParamManager([
    cheeseDescription,
    constantDescription,
  ]);
  t.deepEqual(getParam(stuffKey), cheeseDescription);
  updateStuff(18.1);
  const floatDescription = {
    name: stuffKey,
    value: 18.1,
    type: ParamType.UNKNOWN,
  };
  t.deepEqual(getParam(stuffKey), floatDescription);
  t.deepEqual(getParam(natKey), constantDescription);
  t.deepEqual(getParams(), {
    Nat: constantDescription,
    Stuff: floatDescription,
  });
  updateNat(299792458n);
  t.deepEqual(getParam(natKey).value, 299792458n);
});

const positive = (name, val) => {
  return { changeParam: name, proposedValue: val };
};

const negative = name => {
  return { noChange: name };
};

test('positions amount', t => {
  const amountSpec = { parameterName: 'amount', key: 'something' };
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const amount = AmountMath.makeEmpty(brand);

  const positions = makeParamChangePositions(amountSpec, amount);
  t.deepEqual(positions.positive, positive(amountSpec, amount));
  t.deepEqual(positions.negative, negative(amountSpec));
  t.notDeepEqual(positions.positive, positive(AmountMath.make(brand, [1])));
});

test('positions brand', t => {
  const brandSpec = { parameterName: 'brand', key: 'params' };
  const { brand: roseBrand } = makeIssuerKit('roses', AssetKind.SET);
  const { brand: thornBrand } = makeIssuerKit('thorns', AssetKind.SET);

  const positions = makeParamChangePositions(brandSpec, roseBrand);
  t.deepEqual(positions.positive, positive(brandSpec, roseBrand));
  t.deepEqual(positions.negative, negative(brandSpec));
  t.not(positions.positive, positive(brandSpec, thornBrand));
});

test('positions instance', t => {
  const instanceSpec = { parameterName: 'instance', key: 'something' };
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle('Instance');

  const positions = makeParamChangePositions(instanceSpec, instanceHandle);
  t.deepEqual(positions.positive, positive(instanceSpec, instanceHandle));
  t.deepEqual(positions.negative, negative(instanceSpec));
  t.not(positions.positive, positive(instanceSpec, makeHandle('Instance')));
});

test('positions Installation', t => {
  const installationSpec = { parameterName: 'installation', key: 'something' };
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = makeHandle('Installation');

  const positions = makeParamChangePositions(
    installationSpec,
    installationHandle,
  );
  t.deepEqual(
    positions.positive,
    positive(installationSpec, installationHandle),
  );
  t.deepEqual(positions.negative, negative(installationSpec));
  t.not(
    positions.positive,
    positive(installationSpec, makeHandle('Installation')),
  );
});

test('positions Nat', t => {
  const natSpec = { parameterName: 'nat', key: 'something' };
  const nat = 3n;

  const positions = makeParamChangePositions(natSpec, nat);
  t.deepEqual(positions.positive, positive(natSpec, nat));
  t.deepEqual(positions.negative, negative(natSpec));
  t.notDeepEqual(positions.positive, positive(natSpec, 4n));
});

test('positions Ratio', t => {
  const ratioSpec = { parameterName: 'ratio', key: 'something' };
  const { brand } = makeIssuerKit('elo', AssetKind.NAT);
  const ratio = makeRatio(2500, brand, 2400);

  const positions = makeParamChangePositions(ratioSpec, ratio);
  t.deepEqual(positions.positive, positive(ratioSpec, ratio));
  t.deepEqual(positions.negative, negative(ratioSpec));
  t.notDeepEqual(
    positions.positive,
    positive(ratioSpec, makeRatio(2500, brand, 2200)),
  );
});

test('positions string', t => {
  const stringSpec = { parameterName: 'string', key: 'something' };
  const string = 'When in the course';

  const positions = makeParamChangePositions(stringSpec, string);
  t.deepEqual(positions.positive, positive(stringSpec, string));
  t.deepEqual(positions.negative, negative(stringSpec));
  t.notDeepEqual(
    positions.positive,
    positive(stringSpec, 'We hold these truths'),
  );
});
