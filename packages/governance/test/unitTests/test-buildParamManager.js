// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { ParamType, makeParamManagerBuilder } from '../../src/index.js';

test('two parameters', t => {
  const drachmaKit = makeIssuerKit('drachma');

  const drachmaBrand = drachmaKit.brand;
  const paramManager = makeParamManagerBuilder()
    .addBrand('Currency', drachmaBrand)
    .addAmount('Amt', AmountMath.make(drachmaBrand, 37n))
    .build();

  t.is(paramManager.getBrand('Currency'), drachmaBrand);
  t.deepEqual(
    paramManager.getAmount('Amt'),
    AmountMath.make(drachmaBrand, 37n),
  );
});

test('getParams', t => {
  const drachmaKit = makeIssuerKit('drachma');

  const drachmaBrand = drachmaKit.brand;
  const drachmas = AmountMath.make(drachmaBrand, 37n);
  const paramManager = makeParamManagerBuilder()
    .addBrand('Currency', drachmaBrand)
    .addAmount('Amt', drachmas)
    .build();

  t.deepEqual(
    paramManager.getParams(),
    harden({
      Currency: {
        type: ParamType.BRAND,
        value: drachmaBrand,
      },
      Amt: {
        type: ParamType.AMOUNT,
        value: drachmas,
      },
    }),
  );
});

test('params duplicate entry', async t => {
  const stuffKey = 'Stuff';
  const { brand: stiltonBrand } = makeIssuerKit('stilton', AssetKind.SET);
  t.throws(
    () =>
      makeParamManagerBuilder()
        .addNat(stuffKey, 37n)
        .addUnknown(stuffKey, stiltonBrand)
        .build(),
    {
      message: `"Parameter Name" already registered: "Stuff"`,
    },
  );
});

test('Amount', async t => {
  const { brand } = makeIssuerKit('floor wax');
  const { brand: brand2 } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManagerBuilder()
    .addAmount('Shimmer', AmountMath.make(brand, 250n))
    .build();
  t.deepEqual(paramManager.getAmount('Shimmer'), AmountMath.make(brand, 250n));

  // @ts-ignore updateShimmer is a generated name
  paramManager.updateShimmer(AmountMath.make(brand2, 300n));
  t.deepEqual(paramManager.getAmount('Shimmer'), AmountMath.make(brand2, 300n));

  // @ts-ignore updateShimmer is a generated name
  t.throws(() => paramManager.updateShimmer('fear,loathing'), {
    message: 'Expected an Amount for Shimmer, got "fear,loathing"',
  });

  t.throws(() => paramManager.getNat('Shimmer'), {
    message: '"Shimmer" is not "nat"',
  });
});

test('Branded Amount', async t => {
  const { brand: floorBrand } = makeIssuerKit('floor wax');
  const { brand: dessertBrand } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManagerBuilder()
    .addBrandedAmount('Shimmer', AmountMath.make(floorBrand, 2n))
    .build();
  t.deepEqual(
    paramManager.getAmount('Shimmer'),
    AmountMath.make(floorBrand, 2n),
  );

  // @ts-ignore updateShimmer is a generated name
  paramManager.updateShimmer(AmountMath.make(floorBrand, 5n));
  t.deepEqual(
    paramManager.getAmount('Shimmer'),
    AmountMath.make(floorBrand, 5n),
  );

  // @ts-ignore updateShimmer is a generated name
  t.throws(
    // @ts-ignore updateShimmer is a generated name
    () => paramManager.updateShimmer(AmountMath.make(dessertBrand, 20n)),
    {
      message:
        'The brand in the allegedAmount {"brand":"[Alleged: dessertTopping brand]","value":"[20n]"} in \'coerce\' didn\'t match the specified brand "[Alleged: floor wax brand]".',
    },
  );

  // @ts-ignore updateCandle is a generated name
  t.throws(() => paramManager.updateShimmer('fear,loathing'), {
    message: 'Expected an Amount for Shimmer, got "fear,loathing"',
  });

  t.throws(() => paramManager.getString('Shimmer'), {
    message: '"Shimmer" is not "string"',
  });
});

test('params one installation', async t => {
  const installationKey = 'Installation';
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = Far('fake Installation', {
    getBundle: () => ({ obfuscated: 42 }),
  });

  const paramManager = makeParamManagerBuilder()
    .addInstallation('Installation', installationHandle)
    .build();

  t.deepEqual(
    paramManager.getInstallation(installationKey),
    installationHandle,
  );
  t.throws(
    // @ts-ignore updateInstallation is a generated name
    () => paramManager.updateInstallation(18.1),
    {
      message: 'value for "Installation" must be an Installation, was 18.1',
    },
    'value should be an installation',
  );
  const handle2 = Far('another fake Installation', {
    getBundle: () => ({ condensed: '() => {})' }),
  });
  // @ts-ignore updateInstallation is a generated name
  paramManager.updateInstallation(handle2);
  t.deepEqual(paramManager.getInstallation(installationKey), handle2);

  t.throws(() => paramManager.getNat('Installation'), {
    message: '"Installation" is not "nat"',
  });

  t.deepEqual(
    paramManager.getParams(),
    harden({
      Installation: {
        type: ParamType.INSTALLATION,
        value: handle2,
      },
    }),
  );
});

test('params one instance', async t => {
  const instanceKey = 'Instance';
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle(instanceKey);

  const paramManager = makeParamManagerBuilder()
    .addInstance(instanceKey, instanceHandle)
    .build();

  t.deepEqual(paramManager.getInstance(instanceKey), instanceHandle);
  t.throws(
    // @ts-ignore updateInstance is a generated name
    () => paramManager.updateInstance(18.1),
    {
      message: 'value for "Instance" must be an Instance, was 18.1',
    },
    'value should be an instance',
  );
  const handle2 = makeHandle(instanceKey);
  // @ts-ignore updateInstance is a generated name
  paramManager.updateInstance(handle2);
  t.deepEqual(paramManager.getInstance(instanceKey), handle2);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      Instance: {
        type: ParamType.INSTANCE,
        value: handle2,
      },
    }),
  );
});

test('Invitation', async t => {
  const drachmaKit = makeIssuerKit('drachma');
  const terms = harden({
    mmr: makeRatio(150n, drachmaKit.brand),
  });

  const issuerKeywordRecord = harden({
    Ignore: drachmaKit.issuer,
  });

  const { instance, zoe } = await setupZCFTest(issuerKeywordRecord, terms);

  const invitation = await E(E(zoe).getPublicFacet(instance)).makeInvitation();

  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    invitation,
  );

  const drachmaBrand = drachmaKit.brand;
  const drachmaAmount = AmountMath.make(drachmaBrand, 37n);
  const paramManagerBuilder = makeParamManagerBuilder(zoe)
    .addBrand('Currency', drachmaBrand)
    .addAmount('Amt', drachmaAmount);
  // addInvitation is async, so it can't be part of the cascade.
  await paramManagerBuilder.addInvitation('Invite', invitation);
  const paramManager = paramManagerBuilder.build();

  t.is(paramManager.getBrand('Currency'), drachmaBrand);
  t.is(paramManager.getAmount('Amt'), drachmaAmount);
  const invitationActualAmount = paramManager.getInvitationAmount('Invite')
    .value;
  t.is(invitationActualAmount, invitationAmount.value);
  // @ts-ignore invitationActualAmount's type is unknown
  t.is(invitationActualAmount[0].description, 'simple');

  t.is(await paramManager.getInternalParamValue('Invite'), invitation);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      Amt: {
        type: ParamType.AMOUNT,
        value: drachmaAmount,
      },
      Currency: {
        type: ParamType.BRAND,
        value: drachmaBrand,
      },
      Invite: {
        type: ParamType.INVITATION,
        value: invitationAmount,
      },
    }),
  );
});

test('two Nats', async t => {
  const paramManager = makeParamManagerBuilder()
    .addNat('Acres', 50n)
    .addNat('SpeedLimit', 299_792_458n)
    .build();

  t.is(paramManager.getNat('Acres'), 50n);
  t.is(paramManager.getNat('SpeedLimit'), 299_792_458n);

  // @ts-ignore updateSpeedLimit is a generated name
  t.throws(() => paramManager.updateSpeedLimit(300000000), {
    message: '300000000 must be a bigint',
  });

  // @ts-ignore updateSpeedLimit is a generated name
  t.throws(() => paramManager.updateSpeedLimit(-37n), {
    message: '-37 is negative',
  });
});

test('Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManagerBuilder()
    .addNat('Acres', 50n)
    .addRatio('GoldenRatio', ratio)
    .build();
  t.is(paramManager.getRatio('GoldenRatio'), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  // @ts-ignore updateGoldenRatio is a generated name
  paramManager.updateGoldenRatio(morePrecise);
  t.is(paramManager.getRatio('GoldenRatio'), morePrecise);
  // @ts-ignore updateGoldenRatio is a generated name
  t.throws(() => paramManager.updateGoldenRatio(300000000), {
    message: '"ratio" 300000000 must be a pass-by-copy record, not "number"',
  });
});

test('Branded Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManagerBuilder()
    .addBrandedRatio('GoldenRatio', ratio)
    .build();
  t.is(paramManager.getRatio('GoldenRatio'), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  // @ts-ignore updateGoldenRatio is a generated name
  paramManager.updateGoldenRatio(morePrecise);
  t.is(paramManager.getRatio('GoldenRatio'), morePrecise);

  const anotherBrand = makeIssuerKit('arbitrary').brand;

  // @ts-ignore updateGoldenRatio is a generated name
  t.throws(
    () =>
      // @ts-ignore updateGoldenRatio is a generated name
      paramManager.updateGoldenRatio(makeRatio(16180n, anotherBrand, 10_000n)),
    {
      message:
        'Numerator brand for "GoldenRatio" must be "[Alleged: unitless brand]"',
    },
  );
});

test('Strings', async t => {
  const paramManager = makeParamManagerBuilder()
    .addNat('Acres', 50n)
    .addString('OurWeapons', 'fear')
    .build();
  t.is(paramManager.getString('OurWeapons'), 'fear');

  // @ts-ignore updateOurWeapons is a generated name
  paramManager.updateOurWeapons('fear,surprise');
  t.is(paramManager.getString('OurWeapons'), 'fear,surprise');
  // @ts-ignore updateOurWeapons is a generated name
  t.throws(() => paramManager.updateOurWeapons(300000000), {
    message: '300000000 must be a string',
  });

  t.throws(() => paramManager.getNat('OurWeapons'), {
    message: '"OurWeapons" is not "nat"',
  });
});

test('Unknown', async t => {
  const paramManager = makeParamManagerBuilder()
    .addString('Label', 'birthday')
    .addUnknown('Surprise', 'party')
    .build();
  t.is(paramManager.getUnknown('Surprise'), 'party');

  // @ts-ignore updateSurprise is a generated name
  paramManager.updateSurprise('gift');
  t.is(paramManager.getUnknown('Surprise'), 'gift');
  // @ts-ignore updateSurprise is a generated name
  paramManager.updateSurprise(['gift', 'party']);
  t.deepEqual(paramManager.getUnknown('Surprise'), ['gift', 'party']);
});
