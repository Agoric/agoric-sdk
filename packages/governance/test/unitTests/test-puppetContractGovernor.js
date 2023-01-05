import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { makeZoeKit } from '@agoric/zoe';
import bundleSource from '@endo/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { E } from '@endo/eventual-send';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { MALLEABLE_NUMBER } from '../swingsetTests/contractGovernor/governedContract.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '../../src/index.js';

const governedRoot = '../swingsetTests/contractGovernor/governedContract.js';
const contractGovernorRoot = '../../tools/puppetContractGovernor.js';
const autoRefundRoot = '@agoric/zoe/src/contracts/automaticRefund.js';

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  return contractBundle;
};

// makeBundle is a slow step, so we do it once for all the tests.
const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const governedBundleP = makeBundle(governedRoot);
// could be called fakeCommittee. It's used as a source of invitations only
const autoRefundBundleP = makeBundle(autoRefundRoot);

const setUpZoeForTest = async setJig => {
  const makeFar = o => o;

  /**
   * These properties will be assigned by `setJig` in the contract.
   *
   * @typedef {object} TestContext
   * @property {ZCF} zcf
   * @property {IssuerRecord} mintedIssuerRecord
   * @property {IssuerRecord} govIssuerRecord
   */
  const { zoeService } = makeZoeKit(
    makeFakeVatAdmin(setJig, o => makeFar(o)).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  return {
    zoe,
  };
};

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

// contract governor wants a committee invitation. give it a random invitation
async function getInvitation(zoe, autoRefundInstance) {
  const autoRefundFacets = await E(zoe).startInstance(autoRefundInstance);
  const invitationP = E(autoRefundFacets.publicFacet).makeInvitation();
  const [fakeInvitationPayment, fakeInvitationAmount] = await Promise.all([
    invitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(invitationP),
  ]);
  return { fakeInvitationPayment, fakeInvitationAmount };
}

const setUpGovernedContract = async (zoe, electorateTerms, timer) => {
  const [contractGovernorBundle, autoRefundBundle, governedBundle] =
    await Promise.all([
      contractGovernorBundleP,
      autoRefundBundleP,
      governedBundleP,
    ]);

  const [governor, autoRefund, governed] = await Promise.all([
    installBundle(zoe, contractGovernorBundle),
    installBundle(zoe, autoRefundBundle),
    installBundle(zoe, governedBundle),
  ]);
  const installs = { governor, autoRefund, governed };
  const { fakeInvitationPayment, fakeInvitationAmount } = await getInvitation(
    zoe,
    autoRefund,
  );

  const governedTerms = {
    governedParams: {
      [MALLEABLE_NUMBER]: {
        type: ParamTypes.NAT,
        value: 602214090000000000000000n,
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: fakeInvitationAmount,
      },
    },
    governedApis: ['governanceApi'],
  };
  const governorTerms = {
    timer,
    governedContractInstallation: governed,
    governed: {
      terms: governedTerms,
      issuerKeywordRecord: {},
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    governorTerms,
    {
      governed: {
        initialPoserInvitation: fakeInvitationPayment,
      },
    },
  );

  return { governorFacets, installs };
};

test('multiple params bad change', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [CONTRACT_ELECTORATE]: 13n,
      [MALLEABLE_NUMBER]: 42n,
    },
  });

  await t.throwsAsync(
    () => E(governorFacets.creatorFacet).changeParams(paramChangesSpec),
    {
      message:
        'In "getInvitationDetails" method of (ZoeService zoeService): arg 0: "[13n]" - Must match one of ["[match:remotable]","[match:kind]"]',
    },
  );
});

test('change a param', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  /** @type {GovernedPublicFacet<unknown>} */
  const publicFacet = await E(governorFacets.creatorFacet).getPublicFacet();
  const notifier = makeNotifierFromAsyncIterable(
    await E(publicFacet).getSubscription(),
  );
  const update1 = await notifier.getUpdateSince();
  t.is(
    // @ts-expect-error reaching into unknown values
    update1.value.current.Electorate.value.value[0].description,
    'getRefund',
  );
  t.like(update1, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 602214090000000000000000n },
      },
    },
  });

  // This is the wrong kind of invitation, but governance can't tell
  const { fakeInvitationPayment, fakeInvitationAmount } = await getInvitation(
    zoe,
    installs.autoRefund,
  );

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [CONTRACT_ELECTORATE]: fakeInvitationPayment,
      [MALLEABLE_NUMBER]: 42n,
    },
  });

  E(governorFacets.creatorFacet).changeParams(paramChangesSpec);

  const update2 = await notifier.getUpdateSince(update1.updateCount);
  t.like(update2, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 42n },
      },
    },
  });

  const paramsAfter = await E(publicFacet).getGovernedParams();
  t.deepEqual(paramsAfter.Electorate.value, fakeInvitationAmount);
  t.is(paramsAfter.MalleableNumber.value, 42n);
});

test('set offer Filter directly', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  await E(governorFacets.creatorFacet).setFilters(['whatever']);
  t.deepEqual(
    await E(zoe).getOfferFilter(governorFacets.creatorFacet.getInstance()),
    ['whatever'],
  );
});

test('call API directly', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  await E(governorFacets.creatorFacet).invokeAPI('governanceApi', []);
  t.deepEqual(
    await E(E(governorFacets.creatorFacet).getPublicFacet()).getApiCalled(),
    1,
  );
});
