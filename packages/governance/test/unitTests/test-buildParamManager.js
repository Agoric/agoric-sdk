// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { keyEQ } from '@agoric/store';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { prepareMockRecorderKitMakers } from '@agoric/zoe/tools/mockRecorderKit.js';

import {
  makeParamManagerBuilder,
  ParamTypes,
  buildParamGovernanceExoMakers,
} from '../../src/index.js';

const drachmaKit = makeIssuerKit('drachma');
const drachmaBrand = drachmaKit.brand;

export const makeZoeKit = issuerKit => {
  const terms = harden({
    mmr: makeRatio(150n, issuerKit.brand),
  });
  const issuerKeywordRecord = harden({
    Ignore: issuerKit.issuer,
  });
  return setupZCFTest(issuerKeywordRecord, terms);
};

export const makeBuilder = (zcf, zoe) => {
  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  const baggage = makeScalarBigMapStore('baggage');
  const paramMakerKit = buildParamGovernanceExoMakers(
    zcf.getZoeService(),
    baggage,
  );
  return makeParamManagerBuilder(baggage, recorderKit, paramMakerKit, zoe);
};

test('two parameters', async t => {
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addBrand('Collateral', drachmaBrand)
    .addAmount('Amt', AmountMath.make(drachmaBrand, 37n))
    .build();

  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getCollateral(), drachmaBrand);
  t.deepEqual(getters.getAmt(), AmountMath.make(drachmaBrand, 37n));
});

test('getParams', async t => {
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const drachmas = AmountMath.make(drachmaBrand, 37n);

  const paramManager = await makeBuilder(zcf, zoe)
    .addBrand('Collateral', drachmaBrand)
    .addAmount('Amt', drachmas)
    .build();

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

test('params duplicate entry', async t => {
  const stuffKey = 'Stuff';
  const { brand: stiltonBrand } = makeIssuerKit('stilton', AssetKind.SET);
  const { zcf, zoe } = await makeZoeKit(drachmaKit);

  t.throws(
    () =>
      makeBuilder(zcf, zoe)
        .addNat(stuffKey, 37n)
        .addUnknown(stuffKey, stiltonBrand)
        .build(),
    {
      message:
        'key "Stuff" already registered in collection "Parameter Holders"',
    },
  );
});

test('Amount', async t => {
  const waxKit = makeIssuerKit('floor wax');
  const { brand: floorBrand } = waxKit;
  const { brand: dessertBrand } = makeIssuerKit('dessertTopping');
  const { zcf, zoe } = await makeZoeKit(waxKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addAmount('Shimmer', AmountMath.make(floorBrand, 2n))
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.deepEqual(getters.getShimmer(), AmountMath.make(floorBrand, 2n));

  await paramManager.updateParams({ Shimmer: AmountMath.make(floorBrand, 5n) });
  t.deepEqual(getters.getShimmer(), AmountMath.make(floorBrand, 5n));

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        Shimmer: AmountMath.make(dessertBrand, 20n),
      }),
    {
      message:
        /Shimmer must match \[object Object], was \[object Object]: brand: "\[Alleged: dessertTopping brand]" - Must be: "\[Alleged: floor wax brand]"/,
    },
  );

  await t.throwsAsync(
    () => paramManager.updateParams({ Shimmer: 'fear,loathing' }),
    {
      message:
        /Shimmer must match \[object Object], was fear,loathing: "fear,loathing" - Must be a copyRecord to match a copyRecord pattern: {"brand":"\[Alleged: floor wax brand]","value":"\[match:or]"}/,
    },
  );
});

test('params one installation', async t => {
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  /** @type {Installation} */
  // @ts-expect-error cast
  const installationHandle = Far('fake Installation', {
    getBundle: () => ({ obfuscated: 42 }),
  });

  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addInstallation('PName', installationHandle)
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.deepEqual(getters.getPName(), installationHandle);
  await t.throwsAsync(
    () => paramManager.updateParams({ PName: 18.1 }),
    {
      message:
        /PName must match .*, was 18.1: 18.1 - Must be a remotable Installation, not number/,
    },
    'value should be an installation',
  );
  /** @type {Installation} */
  // @ts-expect-error cast
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
  const handleType = 'Instance';
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle(handleType);

  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addInstance('PName', instanceHandle)
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.deepEqual(getters.getPName(), instanceHandle);
  await t.throwsAsync(
    () => paramManager.updateParams({ PName: 18.1 }),
    {
      message:
        /PName must match \[object match:remotable], was 18.1: 18.1 - Must be a remotable InstanceHandle, not number/,
    },
    'value should be an instance',
  );
  const handle2 = makeHandle(handleType);
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

  const { instance, zoe, zcf } = await setupZCFTest(issuerKeywordRecord, terms);

  const invitation = await E(E(zoe).getPublicFacet(instance)).makeInvitation();

  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    invitation,
  );

  const drachmaAmount = AmountMath.make(drachmaBrand, 37n);
  const paramManagerBuilder = await makeBuilder(zcf, zoe)
    .addBrand('Collateral', drachmaBrand)
    .addAmount('Amt', drachmaAmount)
    .addInvitation('Invite', invitation);
  const paramManager = await paramManagerBuilder.build();
  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getCollateral(), drachmaBrand);
  t.is(getters.getAmt(), drachmaAmount);
  const invitationActualAmount = getters.getInvite().value;
  t.deepEqual(invitationActualAmount, invitationAmount.value);
  t.assert(keyEQ(invitationActualAmount, invitationAmount.value));
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
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addNat('Acres', 50n)
    .addNat('SpeedLimit', 299_792_458n)
    .build();
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
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addRatio('GoldenRatio', ratio)
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getGoldenRatio(), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  await paramManager.updateParams({ GoldenRatio: morePrecise });
  t.is(getters.getGoldenRatio(), morePrecise);

  const anotherBrand = makeIssuerKit('arbitrary').brand;

  await t.throwsAsync(
    () => paramManager.updateParams({ GoldenRatio: 300000000 }),
    {
      message:
        /GoldenRatio must match .*, was 300000000: 300000000 - Must be a copyRecord to match a copyRecord pattern: {"numerator":{"brand":"\[Alleged: unitless brand]","value":"\[match:nat]"}/,
    },
  );

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        GoldenRatio: makeRatio(16180n, anotherBrand, 10_000n),
      }),
    {
      message:
        /GoldenRatio must match \[object Object], was \[object Object]: numerator: brand: "\[Alleged: arbitrary brand]"/,
    },
  );
});

test('Record', async t => {
  const epRecord = harden({
    A1: 'Magical Mystery Tour',
    A2: 'Your Mother Should Know',
    B: 'I Am the Walrus',
    C1: 'The Fool on the Hill',
    C2: 'Flying',
    D: 'Blue Jay Way',
  });
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addRecord('BestEP', epRecord)
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getBestEP(), epRecord);

  const replacement = harden({
    A1: "Wouldn't It Be Nice",
    A2: "Don't Talk",
    B1: 'God Only Knows',
    B2: "I Know There's an Answer",
  });
  await paramManager.updateParams({ BestEP: replacement });
  t.is(getters.getBestEP(), replacement);

  const brokenRecord = {
    A1: 'Long Tall Sally',
    A2: 'I Call Your Name',
    B1: 'Slow Down',
    B2: 'Matchbox',
  };

  await paramManager.updateParams({ BestEP: brokenRecord });
  t.is(getters.getBestEP(), brokenRecord);

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        duration: '2:37',
      }),
    {
      message: 'key "duration" not found in collection "Parameter Holders"',
    },
  );

  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        BestEP: '2:37',
      }),
    {
      message:
        /BestEP must match \[object match:recordOf], was 2:37: string "2:37" - Must be a copyRecord/,
    },
  );
});

test('Strings', async t => {
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addNat('Acres', 50n)
    .addString('OurWeapons', 'fear')
    .build();
  const { behavior: getters } = await paramManager.accessors();
  t.is(getters.getOurWeapons(), 'fear');

  await paramManager.updateParams({ OurWeapons: 'fear,surprise' });
  t.is(getters.getOurWeapons(), 'fear,surprise');
  await t.throwsAsync(
    () =>
      paramManager.updateParams({
        OurWeapons: 300000000,
      }),
    {
      message:
        /OurWeapons must match \[object match:string], was 300000000: number 300000000 - Must be a string/,
    },
  );
});

test('Unknown', async t => {
  const { zcf, zoe } = await makeZoeKit(drachmaKit);
  const paramManager = await makeBuilder(zcf, zoe)
    .addString('Label', 'birthday')
    .addUnknown('Surprise', 'party')
    .build();
  const { behavior: getters } = await paramManager.accessors();

  t.is(getters.getSurprise(), 'party');

  await paramManager.updateParams({ Surprise: 'gift' });
  t.is(getters.getSurprise(), 'gift');
  await paramManager.updateParams({ Surprise: ['gift', 'party'] });
  t.deepEqual(getters.getSurprise(), ['gift', 'party']);
});
