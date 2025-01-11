import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import path from 'path';
import bundleSource from '@endo/bundle-source';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { MALLEABLE_NUMBER } from '@agoric/governance/test/swingsetTests/contractGovernor/governedContract.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';

import { makeSwingsetTestKit } from '../../tools/supports.js';
import {
  makeGovernanceDriver,
  makeWalletFactoryDriver,
} from '../../tools/drivers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const GOVERNED_CONTRACT_SRC = './governedContract.js';
const GOVERNED_CONTRACT2_SRC = './governedContract2.js';

const wallets = [
  'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
  'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
  'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
  'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
  'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
  'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
];

const setUpGovernedContract = async (zoe, timer, EV, controller) => {
  const installBundle = contractBundle => EV(zoe).install(contractBundle);
  const installBundleToVatAdmin = contractBundle =>
    controller.validateAndInstallBundle(contractBundle);
  const source = `${dirname}/${GOVERNED_CONTRACT_SRC}`;
  const source2 = `${dirname}/${GOVERNED_CONTRACT2_SRC}`;
  const governedContractBundle = await bundleSource(source);
  const governedContract2Bundle = await bundleSource(source2);

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const governorInstallation = await EV(agoricNames).lookup(
    'installation',
    'contractGovernor',
  );
  const voteCounterInstallation = await EV(agoricNames).lookup(
    'installation',
    'binaryVoteCounter',
  );

  const electorateCreatorFacet = await EV.vat('bootstrap').consumeItem(
    'economicCommitteeCreatorFacet',
  );
  const poserInvitation = await EV(electorateCreatorFacet).getPoserInvitation();
  const poserInvitation2 = await EV(
    electorateCreatorFacet,
  ).getPoserInvitation();

  const invitationIssuer = await EV(zoe).getInvitationIssuer();
  const invitationAmount =
    await EV(invitationIssuer).getAmountOf(poserInvitation);

  const governedTerms = {
    governedParams: {
      [MALLEABLE_NUMBER]: {
        type: ParamTypes.NAT,
        value: 602214090000000000000000n,
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
    governedApis: ['governanceApi'],
  };

  const governedInstallation = await installBundle(governedContractBundle);
  await installBundleToVatAdmin(governedContract2Bundle);
  const governorTerms = {
    timer,
    governedContractInstallation: governedInstallation,
    governed: {
      terms: governedTerms,
      issuerKeywordRecord: {},
    },
  };

  const governorFacets = await EV(zoe).startInstance(
    governorInstallation,
    {},
    governorTerms,
    {
      governed: {
        initialPoserInvitation: poserInvitation,
      },
    },
  );

  return {
    governorFacets,
    invitationAmount,
    voteCounterInstallation,
    contract2SHA: governedContract2Bundle.endoZipBase64Sha512,
    poserInvitation2,
  };
};

// A more minimal set would be better. We need governance, but not econ vats.
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-test-vaults-config.json';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: PLATFORM_CONFIG,
  });

  const { runUtils, storage, controller } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const timer = await EV.vat('bootstrap').consumeItem('chainTimerService');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  const governanceDriver = await makeGovernanceDriver(
    swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    wallets,
  );

  const facets = await setUpGovernedContract(zoe, timer, EV, controller);

  return { ...swingsetTestKit, facets, governanceDriver };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});

test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test(`start contract; verify`, async t => {
  const { runUtils, facets } = t.context;
  const {
    governorFacets: { creatorFacet },
  } = facets;
  const { EV } = runUtils;
  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

  const avogadro = await EV(contractPublicFacet).getNum();
  t.is(await EV(contractPublicFacet).getApiCalled(), 0);
  t.is(avogadro, 602214090000000000000000n);
});

const getQuestionId = id => `propose-question-${id}`;
const getVoteId = id => `vote-${id}`;

const offerIds = {
  add1: { outgoing: 'add1' },
  add2: { outgoing: 'add2' },
};

test(`verify API governance`, async t => {
  const { runUtils, facets, governanceDriver, storage } = t.context;
  const {
    governorFacets: { creatorFacet, instance },
    voteCounterInstallation: vci,
  } = facets;

  const { EV } = runUtils;
  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

  const committee = governanceDriver.ecMembers;

  const agoricNamesAdmin =
    await EV.vat('bootstrap').consumeItem('agoricNamesAdmin');
  // await EV(agoricNamesAdmin).reserve('governedContract');
  const instanceAdmin = await EV(agoricNamesAdmin).lookupAdmin('instance');
  console.log('UPGA ', { instanceAdmin });
  await EV(instanceAdmin).update('governedContract', instance);
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { governedContract } = agoricNamesRemotes.instance;
  console.log('UPGA ', { governedContract });

  const { economicCommittee, econCommitteeCharter } =
    agoricNamesRemotes.instance;

  console.log('accepting committee invitations');
  await null;
  for (const member of committee) {
    await member.acceptOutstandingCharterInvitation(offerIds.add1.outgoing);
    await member.acceptOutstandingCommitteeInvitation(offerIds.add2.outgoing);
  }

  await governanceDriver.proposeApiCall(
    governedContract,
    'add1',
    [],
    committee[0],
    getQuestionId(6),
    offerIds.add1.outgoing,
  );

  t.like(committee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(6), numWantsSatisfied: 1 },
  });

  await governanceDriver.enactLatestProposal(
    committee.slice(0, 2),
    getVoteId(6),
    offerIds.add1.outgoing,
  );
  for (const w of committee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(6), numWantsSatisfied: 1 },
    });
  }

  const calls = await EV(contractPublicFacet).getApiCalled();
  t.is(calls, 1);

  await t.throwsAsync(
    () => EV(creatorFacet).voteOnApiInvocation('add2', [], vci, 37n),
    {
      message: /"add2" is not a governed API./,
    },
  );
});

test(`upgrade`, async t => {
  const { runUtils, facets } = t.context;
  const {
    governorFacets: { creatorFacet },
    voteCounterInstallation: vci,
    contract2SHA,
    poserInvitation2,
  } = facets;

  const { EV } = runUtils;
  const af = await EV(creatorFacet).getAdminFacet();

  await EV(af).upgradeContract(`b1-${contract2SHA}`, {
    initialPoserInvitation: poserInvitation2,
  });

  const question2 = await EV(creatorFacet).voteOnApiInvocation(
    'add2',
    [],
    vci,
    37n,
  );
  t.truthy(question2.instance);
});

test(`verify API governance post-upgrade`, async t => {
  const { runUtils, facets, governanceDriver } = t.context;
  const {
    governorFacets: { creatorFacet, instance },
    voteCounterInstallation: vci,
  } = facets;

  const { EV } = runUtils;
  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

  const committee = governanceDriver.ecMembers;

  await governanceDriver.proposeApiCall(
    instance,
    'add2',
    [],
    committee[0],
    getQuestionId(6),
    offerIds.add1.incoming,
  );

  t.like(committee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(6), numWantsSatisfied: 1 },
  });

  await governanceDriver.enactLatestProposal(
    committee.slice(0, 2),
    getVoteId(6),
    offerIds.add1.incoming,
  );
  for (const w of committee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(6), numWantsSatisfied: 1 },
    });
  }

  const calls = await EV(contractPublicFacet).getApiCalled();
  t.log('called add2', calls);
  t.is(calls, 3);
});
