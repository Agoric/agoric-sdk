// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { ParamType } from '../../src/index.js';
import { makeParamManager } from '../../src/paramGovernance/typedParamManager.js';

test('two parameters', t => {
  const drachmaKit = makeIssuerKit('drachma');

  const drachmaBrand = drachmaKit.brand;
  const drachmas = AmountMath.make(drachmaBrand, 37n);
  const paramManager = makeParamManager({
    Currency: { type: 'brand', value: drachmaBrand },
    Amt: { type: 'amount', value: drachmas },
  });

  t.is(paramManager.getCurrency(), drachmaBrand);
  t.deepEqual(paramManager.getAmt(), drachmas);
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

test('Amount', async t => {
  const { brand } = makeIssuerKit('floor wax');
  const { brand: brand2 } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManager({
    Shimmer: { type: 'amount', value: AmountMath.make(brand, 250n) },
  });
  t.deepEqual(paramManager.getShimmer(), AmountMath.make(brand, 250n));

  // FIXME decide whether we need the optional brand check on Amount and Ratio, and if so how to express
  // paramManager.updateShimmer(AmountMath.make(brand2, 300n));
  // t.deepEqual(paramManager.getShimmer(), AmountMath.make(brand2, 300n));

  t.throws(() => paramManager.updateShimmer('fear,loathing'), {
    message: 'Expected an Amount for Shimmer, got "fear,loathing"',
  });
});

test('Branded Amount', async t => {
  const { brand: floorBrand } = makeIssuerKit('floor wax');
  const { brand: dessertBrand } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManager({
    Shimmer: { type: 'amount', value: AmountMath.make(floorBrand, 2n) },
  });
  t.deepEqual(paramManager.getShimmer(), AmountMath.make(floorBrand, 2n));

  paramManager.updateShimmer(AmountMath.make(floorBrand, 5n));
  t.deepEqual(paramManager.getShimmer(), AmountMath.make(floorBrand, 5n));

  t.throws(
    () => paramManager.updateShimmer(AmountMath.make(dessertBrand, 20n)),
    {
      message:
        'The brand in the allegedAmount {"brand":"[Alleged: dessertTopping brand]","value":"[20n]"} in \'coerce\' didn\'t match the specified brand "[Alleged: floor wax brand]".',
    },
  );

  t.throws(() => paramManager.updateShimmer('fear,loathing'), {
    message: 'Expected an Amount for Shimmer, got "fear,loathing"',
  });
});

test('params one installation', async t => {
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = Far('fake Installation', {
    getBundle: () => ({ obfuscated: 42 }),
  });

  const paramManager = makeParamManager({
    OneInst: { type: 'installation', value: installationHandle },
  });

  t.deepEqual(paramManager.getOneInst(), installationHandle);
  t.throws(
    () => paramManager.updateOneInst(18.1),
    {
      message: 'value for "OneInst" must be an Installation, was 18.1',
    },
    'value should be an installation',
  );
  const handle2 = Far('another fake Installation', {
    getBundle: () => ({ condensed: '() => {})' }),
  });
  paramManager.updateOneInst(handle2);
  // @ts-expect-error FIXME overly deep type inspection
  t.deepEqual(paramManager.getOneInst(), handle2);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      OneInst: {
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

  const paramManager = makeParamManager({
    OneInst: { type: 'instance', value: instanceHandle },
  });

  t.deepEqual(paramManager.getOneInst(), instanceHandle);
  t.throws(
    () => paramManager.updateOneInst(18.1),
    {
      message: 'value for "OneInst" must be an Instance, was 18.1',
    },
    'value should be an instance',
  );
  const handle2 = makeHandle(instanceKey);
  paramManager.updateOneInst(handle2);
  t.deepEqual(paramManager.getOneInst(), handle2);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      OneInst: {
        type: ParamType.INSTANCE,
        value: handle2,
      },
    }),
  );
});

test.skip('Invitation', async t => {
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
  const invitationActualAmount =
    paramManager.getInvitationAmount('Invite').value;
  t.is(invitationActualAmount, invitationAmount.value);
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
  const paramManager = makeParamManager({
    Acres: { type: 'nat', value: 50n },
    SpeedLimit: { type: 'nat', value: 299_792_458n },
  });

  t.is(paramManager.getAcres(), 50n);
  t.is(paramManager.getSpeedLimit(), 299_792_458n);

  t.throws(() => paramManager.updateSpeedLimit(300000000), {
    message: '300000000 must be a bigint',
  });

  t.throws(() => paramManager.updateSpeedLimit(-37n), {
    message: '-37 is negative',
  });
});

test('Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManager({
    Acres: { type: 'nat', value: 50n },
    GoldenRatio: { type: 'ratio', value: ratio },
  });
  t.is(paramManager.getGoldenRatio(), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  paramManager.updateGoldenRatio(morePrecise);
  t.is(paramManager.getGoldenRatio(), morePrecise);
  t.throws(() => paramManager.updateGoldenRatio(300000000), {
    message: '"ratio" 300000000 must be a pass-by-copy record, not "number"',
  });
});

test('Branded Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManager({
    Acres: { type: 'nat', value: 50n },
    GoldenRatio: { type: 'ratio', value: ratio },
  });
  t.is(paramManager.getGoldenRatio(), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  paramManager.updateGoldenRatio(morePrecise);
  t.is(paramManager.getGoldenRatio(), morePrecise);

  const anotherBrand = makeIssuerKit('arbitrary').brand;

  t.throws(
    () =>
      paramManager.updateGoldenRatio(makeRatio(16180n, anotherBrand, 10_000n)),
    {
      message:
        'Numerator brand for "GoldenRatio" must be "[Alleged: unitless brand]"',
    },
  );
});

test('Strings', async t => {
  const paramManager = makeParamManager({
    Acres: { type: 'nat', value: 50n },
    OurWeapons: { type: 'string', value: 'fear' },
  });
  t.is(paramManager.getOurWeapons(), 'fear');

  paramManager.updateOurWeapons('fear,surprise');
  t.is(paramManager.getOurWeapons(), 'fear,surprise');
  t.throws(() => paramManager.updateOurWeapons(300000000), {
    message: '300000000 must be a string',
  });
});

test('Unknown', async t => {
  const paramManager = makeParamManager({
    Label: { type: 'string', value: 'birtday' },
    Surprise: { type: 'unknown', value: 'party' },
  });
  t.is(paramManager.getSurprise(), 'party');

  paramManager.updateSurprise('gift');
  t.is(paramManager.getSurprise(), 'gift');
  paramManager.updateSurprise(['gift', 'party']);
  t.deepEqual(paramManager.getSurprise(), ['gift', 'party']);
});
