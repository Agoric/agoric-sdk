import { createRequire } from 'node:module';
import path from 'node:path';

import type { TestFn } from 'ava';

import {
  makeGovernanceDriver,
  makeWalletFactoryDriver,
} from '@aglocal/boot/tools/drivers.js';
import {
  makeCosmicSwingsetTestKit,
  makeMockBridgeKit,
} from '@agoric/cosmic-swingset/tools/test-kit.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { MALLEABLE_NUMBER } from '@agoric/governance/test/swingsetTests/contractGovernor/governedContract.js';
import { NonNullish } from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import {
  boardSlottingMarshaller,
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import bundleSource from '@endo/bundle-source';
import { makePromiseKit } from '@endo/promise-kit';

const dirname = path.dirname(new URL(import.meta.url).pathname);
const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);
const { resolve: resolvePath } = createRequire(import.meta.url);

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
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';

const makeDefaultTestContext = async () => {
  console.time('DefaultTestContext');
  const storage = makeFakeStorageKit('bootstrapTests');
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configOverrides: NonNullish(
      await loadSwingsetConfigFile(resolvePath(PLATFORM_CONFIG)),
    ),
    mockBridgeReceiver: makeMockBridgeKit({ storageKit: storage }),
  });

  const { controller, runNextBlock, runUtils } = swingsetTestKit;
  await runNextBlock();

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

  const readLatestEntryFromStorage = (_path: string) => {
    let data;
    try {
      data = unmarshalFromVstorage(storage.data, _path, fromCapData, -1);
    } catch {
      // fall back to regular JSON
      const raw = storage.getValues(_path).at(-1);
      assert(raw, `No data found for ${_path}`);
      data = JSON.parse(raw);
    }
    return data;
  };

  const readPublished = (subPath: string) =>
    readLatestEntryFromStorage(`published.${subPath}`);

  const governanceDriver = await makeGovernanceDriver(
    // @ts-expect-error
    { ...swingsetTestKit, readPublished },
    agoricNamesRemotes,
    walletFactoryDriver,
    wallets,
  );

  const facets = await setUpGovernedContract(zoe, timer, EV, controller);

  const governedContract = makePromiseKit();
  return {
    ...swingsetTestKit,
    facets,
    governedContract,
    governanceDriver,
    storage,
  };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => (t.context = await makeDefaultTestContext()));

test.after.always(t => t.context.shutdown?.());

test.serial(`start contract; verify`, async t => {
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

const getQuestionId = (id: number) => `propose-question-${id}`;
const getVoteId = (id: number) => `vote-${id}`;

const offerIds = {
  invite: { charter: 'ch', committee: 'ctt' },
  add1: { outgoing: 'add1' },
  add2: { outgoing: 'add2' },
};

test.serial(`verify API governance`, async t => {
  const {
    runUtils,
    facets,
    governanceDriver,
    storage,
    advanceTimeBy,
    governedContract,
  } = t.context;
  const {
    governorFacets: { creatorFacet, instance },
  } = facets;

  const { EV } = runUtils;
  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

  const committee = governanceDriver.ecMembers;

  const agoricNamesAdmin =
    await EV.vat('bootstrap').consumeItem('agoricNamesAdmin');
  const instanceAdmin = await EV(agoricNamesAdmin).lookupAdmin('instance');
  await EV(instanceAdmin).update('governedContract', instance);
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  governedContract.resolve(agoricNamesRemotes.instance.governedContract);

  for (const member of committee) {
    await member.acceptOutstandingCharterInvitation(offerIds.invite.charter);
    await member.acceptOutstandingCommitteeInvitation(
      offerIds.invite.committee,
    );
  }
  const econCharterKit =
    await EV.vat('bootstrap').consumeItem('econCharterKit');

  const charterCreatorFacet = await EV.get(econCharterKit).creatorFacet;
  await EV(charterCreatorFacet).addInstance(
    instance,
    creatorFacet,
    'governedContract',
  );

  const governedContractInstance = await governedContract.promise;
  await governanceDriver.proposeApiCall(
    governedContractInstance,
    'add1',
    [],
    committee[0],
    getQuestionId(1),
    offerIds.invite.charter,
  );

  t.like(committee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(1), numWantsSatisfied: 1 },
  });

  await governanceDriver.enactLatestProposal(
    committee,
    getVoteId(1),
    offerIds.invite.committee,
  );

  for (const w of committee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(1), numWantsSatisfied: 1 },
    });
  }
  await advanceTimeBy(1, 'minutes');

  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.is(lastOutcome.outcome, 'win');

  const calls = await EV(contractPublicFacet).getApiCalled();
  t.is(calls, 1);
});

test.serial(`upgrade`, async t => {
  const { runUtils, facets } = t.context;
  const {
    governorFacets: { creatorFacet },
    contract2SHA,
    poserInvitation2,
  } = facets;

  const { EV } = runUtils;
  const af = await EV(creatorFacet).getAdminFacet();

  await EV(af).upgradeContract(`b1-${contract2SHA}`, {
    initialPoserInvitation: poserInvitation2,
  });

  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();
  const calls = await EV(contractPublicFacet).getApiCalled();
  t.is(calls, 1);
});

test.serial(`verify API governance post-upgrade`, async t => {
  const {
    runUtils,
    facets,
    governanceDriver,
    advanceTimeBy,
    governedContract,
  } = t.context;
  const {
    governorFacets: { creatorFacet },
  } = facets;

  const { EV } = runUtils;

  const committee = governanceDriver.ecMembers;

  await governanceDriver.proposeApiCall(
    await governedContract.promise,
    'add2',
    [],
    committee[0],
    getQuestionId(2),
    offerIds.invite.charter,
  );

  t.like(committee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(2), numWantsSatisfied: 1 },
  });

  await governanceDriver.enactLatestProposal(
    committee,
    getVoteId(2),
    offerIds.invite.committee,
  );

  for (const w of committee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(2), numWantsSatisfied: 1 },
    });
  }
  await advanceTimeBy(1, 'minutes');

  const lastOutcome = governanceDriver.getLatestOutcome();
  t.is(lastOutcome.outcome, 'win');

  const contractPublicFacet = await EV(creatorFacet).getPublicFacet();
  const calls = await EV(contractPublicFacet).getApiCalled();
  t.is(calls, 3);
});
