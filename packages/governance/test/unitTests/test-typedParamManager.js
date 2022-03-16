// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { ParamTypes } from '../../src/index.js';
import {
  makeParamManager,
  makeParamManagerSync,
} from '../../src/paramGovernance/typedParamManager.js';

const drachmaKit = makeIssuerKit('drachma');
const drachmaBrand = drachmaKit.brand;

test('types', t => {
  t.throws(() =>
    makeParamManagerSync({
      // @ts-expect-error invalid value for the declared type
      BrokenBrand: ['brand', 'not a brand'],

      BrokenInvitation: [
        // @ts-expect-error not supported in makeParamManagerSync
        'invitation',
        undefined,
      ],
    }),
  );
  const mgr = makeParamManagerSync({
    Working: ['nat', 0n],
  });
  mgr.getWorking().valueOf();
  t.throws(() =>
    // @ts-expect-error should break
    mgr.updateWorking('not a bigint'),
  );
});

test('asGetters', t => {
  const drachmas = AmountMath.make(drachmaBrand, 37n);
  const paramManager = makeParamManagerSync({
    Currency: ['brand', drachmaBrand],
    Amt: ['amount', drachmas],
  });
  const getters = paramManager.asGetters();
  t.is(paramManager.getCurrency, getters.getCurrency);
  t.is(paramManager.getAmt, getters.getAmt);
});

test('two parameters', t => {
  const drachmas = AmountMath.make(drachmaBrand, 37n);
  const paramManager = makeParamManagerSync({
    Currency: ['brand', drachmaBrand],
    Amt: ['amount', drachmas],
  });

  t.is(paramManager.getCurrency(), drachmaBrand);
  t.is(paramManager.asGetters().getCurrency(), drachmaBrand);
  t.deepEqual(paramManager.getAmt(), drachmas);
  t.deepEqual(
    paramManager.getParams(),
    harden({
      Currency: {
        type: ParamTypes.Brand,
        value: drachmaBrand,
      },
      Amt: {
        type: ParamTypes.Amount,
        value: drachmas,
      },
    }),
  );
});

test('Amount', async t => {
  const { brand } = makeIssuerKit('floor wax');
  const { brand: brand2 } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManagerSync({
    Shimmer: ['amount', AmountMath.make(brand, 250n)],
  });
  t.deepEqual(paramManager.getShimmer(), AmountMath.make(brand, 250n));

  paramManager.updateShimmer(AmountMath.make(brand2, 300n));
  t.deepEqual(paramManager.getShimmer(), AmountMath.make(brand2, 300n));

  // @ts-expect-error
  t.throws(() => paramManager.updateShimmer('fear,loathing'), {
    message: 'Expected an Amount for Shimmer, got "fear,loathing"',
  });
});

test('Branded Amount', async t => {
  const { brand: floorBrand } = makeIssuerKit('floor wax');
  const { brand: dessertBrand } = makeIssuerKit('dessertTopping');
  const paramManager = makeParamManagerSync({
    Shimmer: ['brandedAmount', AmountMath.make(floorBrand, 2n)],
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

  // @ts-expect-error
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

  const paramManager = makeParamManagerSync({
    PName: ['installation', installationHandle],
  });

  t.deepEqual(paramManager.getPName(), installationHandle);
  t.throws(
    // @ts-expect-error throw test
    () => paramManager.updatePName(18.1),
    {
      message: 'value for "PName" must be an Installation, was 18.1',
    },
    'value should be an installation',
  );
  const handle2 = Far('another fake Installation', {
    getBundle: () => ({ condensed: '() => {})' }),
  });
  paramManager.updatePName(handle2);
  t.deepEqual(paramManager.getPName(), handle2);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      PName: {
        type: ParamTypes.Installation,
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

  const paramManager = makeParamManagerSync({
    PName: ['instance', instanceHandle],
  });

  t.deepEqual(paramManager.getPName(), instanceHandle);
  t.throws(
    // @ts-expect-error
    () => paramManager.updatePName(18.1),
    {
      message: 'value for "PName" must be an Instance, was 18.1',
    },
    'value should be an instance',
  );
  const handle2 = makeHandle(instanceKey);
  paramManager.updatePName(handle2);
  t.deepEqual(paramManager.getPName(), handle2);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      PName: {
        type: ParamTypes.Instance,
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

  const { instance, zoe } = await setupZCFTest(issuerKeywordRecord, terms);

  const invitation = await E(E(zoe).getPublicFacet(instance)).makeInvitation();

  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    invitation,
  );

  const drachmaAmount = AmountMath.make(drachmaBrand, 37n);
  const paramManager = await makeParamManager(
    {
      Currency: ['brand', drachmaBrand],
      Amt: ['amount', drachmaAmount],
      Invite: ['invitation', invitation],
    },
    zoe,
  );

  t.is(paramManager.getCurrency(), drachmaBrand);
  t.is(paramManager.getAmt(), drachmaAmount);
  const invitationActualAmount = paramManager.getInvite().value;
  t.is(invitationActualAmount, invitationAmount.value);
  t.is(invitationActualAmount[0].description, 'simple');

  t.is(await paramManager.getInternalParamValue('Invite'), invitation);

  t.deepEqual(
    paramManager.getParams(),
    harden({
      Amt: {
        type: ParamTypes.Amount,
        value: drachmaAmount,
      },
      Currency: {
        type: ParamTypes.Brand,
        value: drachmaBrand,
      },
      Invite: {
        type: ParamTypes.Invitation,
        value: invitationAmount,
      },
    }),
  );
});

test('two Nats', async t => {
  const paramManager = makeParamManagerSync({
    Acres: ['nat', 50n],
    SpeedLimit: ['nat', 299_792_458n],
  });

  t.is(paramManager.getAcres(), 50n);
  t.is(paramManager.getSpeedLimit(), 299_792_458n);

  // @ts-expect-error
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
  const paramManager = makeParamManagerSync({
    Acres: ['nat', 50n],
    GoldenRatio: ['ratio', ratio],
  });
  t.is(paramManager.getGoldenRatio(), ratio);

  const morePrecise = makeRatio(1618033n, unitlessBrand, 1_000_000n);
  paramManager.updateGoldenRatio(morePrecise);
  t.is(paramManager.getGoldenRatio(), morePrecise);
  // @ts-expect-error
  t.throws(() => paramManager.updateGoldenRatio(300000000), {
    message: '"ratio" 300000000 must be a pass-by-copy record, not "number"',
  });
});

test('Branded Ratio', async t => {
  const unitlessBrand = makeIssuerKit('unitless').brand;

  const ratio = makeRatio(16180n, unitlessBrand, 10_000n);
  const paramManager = makeParamManagerSync({
    Acres: ['nat', 50n],
    GoldenRatio: ['brandedRatio', ratio],
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
  const paramManager = makeParamManagerSync({
    Acres: ['nat', 50n],
    OurWeapons: ['string', 'fear'],
  });
  t.is(paramManager.getOurWeapons(), 'fear');

  paramManager.updateOurWeapons('fear,surprise');
  t.is(paramManager.getOurWeapons(), 'fear,surprise');
  // @ts-expect-error
  t.throws(() => paramManager.updateOurWeapons(300000000), {
    message: '300000000 must be a string',
  });
});

test('Unknown', async t => {
  const paramManager = makeParamManagerSync({
    Label: ['string', 'birthday'],
    Surprise: ['unknown', 'party'],
  });
  t.is(paramManager.getSurprise(), 'party');

  paramManager.updateSurprise('gift');
  t.is(paramManager.getSurprise(), 'gift');
  paramManager.updateSurprise(['gift', 'party']);
  t.deepEqual(paramManager.getSurprise(), ['gift', 'party']);
});
