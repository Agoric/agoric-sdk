import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { prepareMockRecorderKitMakers } from '@agoric/zoe/tools/mockRecorderKit.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import {
  buildParamGovernanceExoMakers,
  makeParamManager,
  makeParamManagerFromTermsAndMakers,
  ParamTypes,
} from '../../src/index.js';

const drachmaKit = makeIssuerKit('drachma');
const drachmaBrand = drachmaKit.brand;
const baggage = makeScalarBigMapStore('baggage');

async function makeKits() {
  const terms = harden({
    mmr: makeRatio(150n, drachmaKit.brand),
  });
  const issuerKeywordRecord = harden({
    Ignore: drachmaKit.issuer,
  });
  const { zcf } = await setupZCFTest(issuerKeywordRecord, terms);

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  const paramMakerKit = buildParamGovernanceExoMakers(
    zcf.getZoeService(),
    baggage,
  );
  return { recorderKit, paramMakerKit };
}
const { recorderKit, paramMakerKit } = await makeKits();

test('types: bad invitation', async t => {
  t.throws(() =>
    makeParamManager(
      recorderKit,
      baggage,
      {
        // @ts-expect-error invalid value for the declared type
        BrokenBrand: [ParamTypes.BRAND, 'not a brand'],

        // @ts-expect-error not supported in makeParamManagerSync
        BrokenInvitation: ['invitation', undefined],
      },
      paramMakerKit,
    ),
  );
});

test('types: working', async t => {
  const mgr = makeParamManager(
    recorderKit,
    baggage,
    {
      Working: [ParamTypes.NAT, 0n],
    },
    paramMakerKit,
  );
  const { behavior: getters } = await mgr.accessors();

  getters.getWorking().valueOf();
  await t.throwsAsync(() => mgr.updateParams({ Working: 'not a bigint' }));
});

// I don't see a way to make zcf with terms containing the Electorate before I have the invitationIssuer.
test.skip('makeParamManagerFromTermsAndMakers', async t => {
  const terms = harden({
    governedParams: {
      Mmr: { type: 'nat', value: makeRatio(150n, drachmaKit.brand) },
    },
  });
  const issuerKeywordRecord = harden({
    Ignore: drachmaKit.issuer,
  });
  const { zcf } = await setupZCFTest(issuerKeywordRecord, terms);

  const invitation = zcf.makeInvitation(() => null, 'mock poser invitation');
  const paramManager = await makeParamManagerFromTermsAndMakers(
    recorderKit,
    // @ts-expect-error missing governance terms
    zcf,
    baggage,
    { Electorate: [invitation] },
    {
      Mmr: 'ratio',
    },
    paramMakerKit,
  );
  const { behavior: getters } = await paramManager.accessors();
  t.deepEqual(getters.getMmr(), terms.governedParams.Mmr.value);
});

test('two parameters', async t => {
  const drachmas = AmountMath.make(drachmaBrand, 37n);
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Collateral: [ParamTypes.BRAND, drachmaBrand],
      Amt: [ParamTypes.AMOUNT, drachmas],
    },
    paramMakerKit,
  );

  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getCollateral(), drachmaBrand);
  t.deepEqual(getters.getAmt(), drachmas);
  t.deepEqual(
    await paramManager.getParamDescriptions(),
    harden({
      Collateral: {
        type: ParamTypes.BRAND,
        value: drachmaBrand,
      },
      Amt: {
        type: ParamTypes.AMOUNT,
        value: drachmas,
      },
    }),
  );
});

test('Amount', async t => {
  const { brand: floorBrand } = makeIssuerKit('floor wax');
  const { brand: dessertBrand } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Shimmer: [ParamTypes.AMOUNT, AmountMath.make(floorBrand, 2n)],
    },
    paramMakerKit,
  );

  const { behavior: params } = await paramManager.accessors();
  t.deepEqual(params.getShimmer(), AmountMath.make(floorBrand, 2n));

  await paramManager.updateParams({ Shimmer: AmountMath.make(floorBrand, 5n) });
  t.deepEqual(params.getShimmer(), AmountMath.make(floorBrand, 5n));

  await t.throwsAsync(
    () => paramManager.updateParams({ Shimmer: 'fear,loathing' }),
    {
      message:
        /Shimmer must match .*, was fear,loathing: "fear,loathing" - Must be a copyRecord to match a copyRecord pattern:/,
    },
  );

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        Shimmer: AmountMath.make(dessertBrand, 20n),
      }),
    {
      message:
        /Shimmer must match .*: brand: "\[Alleged: dessertTopping brand]" - Must be: "\[Alleged: floor wax brand]"/,
    },
  );

  await t.throwsAsync(
    () => paramManager.updateParams({ Shimmer: 'fear,loathing' }),
    {
      message:
        /Shimmer must match .*: "fear,loathing" - Must be a copyRecord to match a copyRecord pattern:/,
    },
  );
});

test('params one installation', async t => {
  const terms = harden({
    mmr: makeRatio(150n, drachmaKit.brand),
  });
  const issuerKeywordRecord = harden({
    Ignore: drachmaKit.issuer,
  });
  const { zcf } = await setupZCFTest(issuerKeywordRecord, terms);

  /** @type {Installation} */
  // @ts-expect-error mock
  const installationHandle = Far('fake Installation', {
    getBundle: () => ({ obfuscated: 42 }),
  });

  const paramManager = await makeParamManager(
    recorderKit,
    baggage,
    {
      PName: ['installation', installationHandle],
    },
    paramMakerKit,
    zcf,
  );

  const { behavior: getters } = await paramManager.accessors();
  t.deepEqual(getters.getPName(), installationHandle);
  await t.throwsAsync(
    () => paramManager.updateParams({ PName: 18.1 }),
    {
      message:
        /PName must match \[object match:remotable], was 18.1: 18.1 - Must be a remotable Installation, not number/,
    },
    'value should be an installation',
  );
  /** @type {Installation} */
  // @ts-expect-error mock
  const handle2 = Far('another fake Installation', {
    getBundle: () => ({ condensed: '() => {})' }),
  });
  await paramManager.updateParams({ PName: handle2 });
  t.deepEqual(getters.getPName(), handle2);

  t.deepEqual(
    await paramManager.getParamDescriptions(),
    harden({
      PName: {
        type: ParamTypes.INSTALLATION,
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

  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      PName: ['instance', instanceHandle],
    },
    paramMakerKit,
  );
  const { behavior: getters } = await paramManager.accessors();

  t.deepEqual(getters.getPName(), instanceHandle);
  await t.throwsAsync(
    () => paramManager.updateParams({ PName: 18.1 }),
    {
      message:
        /ame must match .*, was 18.1: 18.1 - Must be a remotable InstanceHandle, not number/,
    },
    'value should be an instance',
  );
  const handle2 = makeHandle(instanceKey);
  await paramManager.updateParams({ PName: handle2 });
  t.deepEqual(getters.getPName(), handle2);

  t.deepEqual(
    await paramManager.getParamDescriptions(),
    harden({
      PName: {
        type: ParamTypes.INSTANCE,
        value: handle2,
      },
    }),
  );
});

test('Invitation', async t => {
  const terms = harden({
    mmr: makeRatio(150n, drachmaKit.brand),
  });

  const issuerKeywordRecord = harden({
    Ignore: drachmaKit.issuer,
  });

  const { instance, zcf, zoe } = await setupZCFTest(issuerKeywordRecord, terms);

  const invitation = await E(E(zoe).getPublicFacet(instance)).makeInvitation();

  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    invitation,
  );

  const drachmaAmount = AmountMath.make(drachmaBrand, 37n);
  const paramManager = await makeParamManager(
    recorderKit,
    baggage,
    {
      Collateral: [ParamTypes.BRAND, drachmaBrand],
      Amt: [ParamTypes.AMOUNT, drachmaAmount],
      Invite: [ParamTypes.INVITATION, [invitation, invitationAmount]],
    },
    paramMakerKit,
    zcf,
  );
  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getCollateral(), drachmaBrand);
  t.is(getters.getAmt(), drachmaAmount);
  const invitationActualAmount = getters.getInvite().value;
  t.deepEqual(invitationActualAmount, invitationAmount.value);
  t.is(invitationActualAmount[0].description, 'simple');

  t.is(await paramManager.getInternalParamValue('Invite'), invitation);

  t.deepEqual(
    await paramManager.getParamDescriptions(),
    harden({
      Amt: {
        type: ParamTypes.AMOUNT,
        value: drachmaAmount,
      },
      Collateral: {
        type: ParamTypes.BRAND,
        value: drachmaBrand,
      },
      Invite: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    }),
  );
});

test('two Nats', async t => {
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Acres: [ParamTypes.NAT, 50n],
      SpeedLimit: [ParamTypes.NAT, 299_792_458n],
    },
    paramMakerKit,
  );

  const { behavior: getters } = await paramManager.accessors();
  t.is(getters.getAcres(), 50n);
  t.is(getters.getSpeedLimit(), 299_792_458n);

  await t.throwsAsync(
    () => paramManager.updateParams({ SpeedLimit: 300000000 }),
    {
      message:
        /SpeedLimit must match \[object match:nat], was 300000000: number 300000000 - Must be a bigint/,
    },
  );

  await t.throwsAsync(() => paramManager.updateParams({ SpeedLimit: -37n }), {
    message:
      /SpeedLimit must match \[object match:nat], was -37: "\[-37n]" - Must be non-negative/,
  });
});

test('Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Acres: [ParamTypes.NAT, 50n],
      GoldenRatio: ['ratio', ratio],
    },
    paramMakerKit,
  );
  const { behavior: getters } = await paramManager.accessors();
  t.is(getters.getGoldenRatio(), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  await paramManager.updateParams({ GoldenRatio: morePrecise });
  t.is(getters.getGoldenRatio(), morePrecise);

  await t.throwsAsync(
    () => paramManager.updateParams({ GoldenRatio: 300000000 }),
    {
      message:
        /GoldenRatio must match \[object Object], was 300000000: 300000000 - Must be a copyRecord to match a copyRecord pattern: {"numerator":{"brand":"\[Alleged: unitless brand]","value":"\[match:nat]"},"denominator":{"brand":"\[Seen]","value":"\[Seen]"}}/,
    },
  );

  const anotherBrand = makeIssuerKit('arbitrary').brand;

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        GoldenRatio: makeRatio(16180n, anotherBrand, 10_000n),
      }),
    {
      message:
        /GoldenRatio must match \[object Object], was \[object Object]: numerator: brand: "\[Alleged: arbitrary brand]" - Must be: "\[Alleged: unitless brand]"/,
    },
  );
});

test('Strings', async t => {
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Acres: [ParamTypes.NAT, 50n],
      OurWeapons: ['string', 'fear'],
    },
    paramMakerKit,
  );
  const { behavior: getters } = await paramManager.accessors();
  t.is(getters.getOurWeapons(), 'fear');

  await paramManager.updateParams({ OurWeapons: 'fear,surprise' });
  t.is(getters.getOurWeapons(), 'fear,surprise');
  await t.throwsAsync(
    () => paramManager.updateParams({ OurWeapons: 300000000 }),
    {
      message:
        /OurWeapons must match \[object match:string], was 300000000: number 300000000 - Must be a string/,
    },
  );
});

test('Unknown', async t => {
  const paramManager = makeParamManager(
    recorderKit,
    baggage,
    {
      Label: ['string', 'birthday'],
      Surprise: ['unknown', 'party'],
    },
    paramMakerKit,
  );
  const { behavior: getters } = await paramManager.accessors();
  t.is(getters.getSurprise(), 'party');

  await paramManager.updateParams({ Surprise: 'gift' });
  t.is(getters.getSurprise(), 'gift');
  await paramManager.updateParams({ Surprise: ['gift', 'party'] });
  t.deepEqual(getters.getSurprise(), ['gift', 'party']);
});
