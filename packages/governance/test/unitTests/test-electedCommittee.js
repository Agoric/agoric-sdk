import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/eventual-send';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@endo/bundle-source';
import path from 'path';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/notifier/tools/testSupports.js';

import {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  coerceQuestionSpec,
} from '../../src/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const electorateRoot = `${dirname}/../../src/electedCommittee.js`;
const slateCounterRoot = `${dirname}/../../src/slateVoteCounter.js`;
const counterRoot = `${dirname}/../../src/binaryVoteCounter.js`;

const setupContract = async () => {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mockChainStorageRoot = makeMockChainStorageRoot();

  const [electorateBundle, counterBundle, slateCounterBundle] =
    await Promise.all([
      bundleSource(electorateRoot),
      bundleSource(counterRoot),
      bundleSource(slateCounterRoot),
    ]);

  const [
    electorateInstallation,
    counterInstallation,
    slateCounterInstallation,
  ] = await Promise.all([
    E(zoe).install(electorateBundle),
    E(zoe).install(counterBundle),
    E(zoe).install(slateCounterBundle),
  ]);

  const terms = { committeeName: 'illuminati', committeeSize: 5 };
  const electorateStartResult = await E(zoe).startInstance(
    electorateInstallation,
    {},
    terms,
    {
      storageNode: mockChainStorageRoot.makeChildNode('thisElectorate'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    },
  );

  return {
    counterInstallation,
    slateCounterInstallation,
    electorateStartResult,
    mockChainStorageRoot,
  };
};

test('committee-elected elect members', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    slateCounterInstallation,
    mockChainStorageRoot,
  } = await setupContract();

  const timer = buildManualTimer(t.log);

  const candidates = [
    { name: 'Bob', address: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce' },
    { name: 'Alice', address: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang' },
    {
      name: 'Charlie',
      address: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    },
  ];

  const positions = [harden({ text: 'yes' }), harden({ text: 'no' })];

  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: harden({ text: 'Election for bakery committee members' }),
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    maxWinners: 1,
    closingRule: {
      timer,
      deadline: 1n,
    },
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: positions[1],
    winOutcome: candidates,
  });

  const { publicFacet: counterPublicFacet, creatorFacet: counterCreatorFacet } =
    await E(creatorFacet).startCommitteeElection(
      slateCounterInstallation,
      questionSpec,
    );

  const electionQuestions = await publicFacet.getElectionQuestions();
  const electionQuestion = E(publicFacet).getElectionQuestion(
    electionQuestions[0],
  );

  const electionDetails = await E(electionQuestion).getDetails();

  const issue = electionDetails.issue;
  t.deepEqual(issue.text, 'Election for bakery committee members');
  t.deepEqual(
    mockChainStorageRoot.getBody(
      'mockChainStorageRoot.thisElectorate.latestElectionQuestion',
    ),
    {
      closingRule: {
        deadline: 1n,
        timer: {
          iface: 'Alleged: ManualTimer',
        },
      },
      counterInstance: {
        iface: 'Alleged: InstanceHandle',
      },
      electionType: 'survey',
      issue: {
        text: 'Election for bakery committee members',
      },
      maxChoices: 1,
      maxWinners: 1,
      method: 'unranked',
      positions: [
        {
          text: 'yes',
        },
        {
          text: 'no',
        },
      ],
      questionHandle: {
        iface: 'Alleged: QuestionHandle',
      },
      quorumRule: 'no_quorum',
      tieOutcome: {
        text: 'no',
      },
      winOutcome: [
        {
          address: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
          name: 'Bob',
        },
        {
          address: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
          name: 'Alice',
        },
        {
          address: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
          name: 'Charlie',
        },
      ],
    },
  );

  const aliceSeat = makeHandle('Voter');
  const pos = counterPublicFacet.getQuestion().getDetails().positions;
  await E(counterCreatorFacet).submitVote(aliceSeat, [pos[0]]);

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  const outcome = await E(counterPublicFacet).getOutcome();
  t.deepEqual(outcome, candidates);
});
