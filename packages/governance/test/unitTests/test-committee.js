import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import path from 'path';
import { E } from '@endo/eventual-send';
import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@endo/bundle-source';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';

import {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  coerceQuestionSpec,
} from '../../src/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const electorateRoot = `${dirname}/../../src/committee.js`;
const counterRoot = `${dirname}/../../src/binaryVoteCounter.js`;

const setupContract = async () => {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mockChainStorageRoot = makeMockChainStorageRoot();

  // pack the contract
  const [electorateBundle, counterBundle] = await Promise.all([
    bundleSource(electorateRoot),
    bundleSource(counterRoot),
  ]);
  // install the contract
  /** @typedef {Installation<import('../../src/committee.js').start>} CommitteInstallation */
  /** @typedef {Installation<import('../../src/binaryVoteCounter.js').start>} CounterInstallation */
  /** @type {[CommitteInstallation, CounterInstallation] } */
  const [electorateInstallation, counterInstallation] = await Promise.all([
    E(zoe).install(electorateBundle),
    E(zoe).install(counterBundle),
  ]);
  const terms = { committeeName: 'illuminati', committeeSize: 13 };
  const electorateStartResult = await E(zoe).startInstance(
    electorateInstallation,
    {},
    terms,
    {
      storageNode: mockChainStorageRoot.makeChildNode('thisElectorate'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    },
  );

  return { counterInstallation, electorateStartResult, mockChainStorageRoot };
};

test('committee-open no questions', async t => {
  const {
    electorateStartResult: { publicFacet },
  } = await setupContract();
  t.deepEqual(await publicFacet.getOpenQuestions(), []);
});

test('committee-open question:one', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    counterInstallation,
    mockChainStorageRoot,
  } = await setupContract();

  const positions = [harden({ text: 'because' }), harden({ text: 'why not?' })];
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: harden({ text: 'why' }),
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    maxWinners: 1,
    closingRule: {
      timer: buildManualTimer(t.log),
      deadline: 2n,
    },
    quorumRule: QuorumRule.MAJORITY,
    tieOutcome: positions[1],
  });
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec);
  const questions = await publicFacet.getOpenQuestions();
  const question = E(publicFacet).getQuestion(questions[0]);
  const questionDetails = await E(question).getDetails();
  /** @type {SimpleIssue} */
  // @ts-expect-error cast
  const issue = questionDetails.issue;
  t.deepEqual(issue.text, 'why');
  t.deepEqual(
    mockChainStorageRoot.getBody(
      'mockChainStorageRoot.thisElectorate.latestQuestion',
    ),
    {
      closingRule: {
        deadline: 2n,
        timer: {
          iface: 'Alleged: ManualTimer',
        },
      },
      counterInstance: {
        iface: 'Alleged: InstanceHandle',
      },
      electionType: 'survey',
      issue: {
        text: 'why',
      },
      maxChoices: 1,
      maxWinners: 1,
      method: 'unranked',
      positions: [
        {
          text: 'because',
        },
        {
          text: 'why not?',
        },
      ],
      questionHandle: {
        iface: 'Alleged: QuestionHandle',
      },
      quorumRule: 'majority',
      tieOutcome: {
        text: 'why not?',
      },
      winningThreshold: undefined,
    },
  );
});

test('committee-open question:mixed', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    counterInstallation,
    mockChainStorageRoot,
  } = await setupContract();

  const timer = buildManualTimer(t.log);
  const positions = [harden({ text: 'because' }), harden({ text: 'why not?' })];
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: harden({ text: 'why' }),
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    maxWinners: 1,
    closingRule: { timer, deadline: 4n },
    quorumRule: QuorumRule.MAJORITY,
    tieOutcome: positions[1],
  });
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec);
  // First question writes
  await eventLoopIteration();
  t.like(
    mockChainStorageRoot.getBody(
      'mockChainStorageRoot.thisElectorate.latestQuestion',
    ),
    {
      issue: {
        text: 'why',
      },
    },
  );

  const questionSpec2 = {
    ...questionSpec,
    issue: harden({ text: 'why2' }),
    closingRule: questionSpec.closingRule,
    quorumRule: QuorumRule.MAJORITY,
  };
  await E(creatorFacet).addQuestion(counterInstallation, questionSpec2);
  // Second question overwrites chain storage. Subscribers responsible for tracking history.
  await eventLoopIteration();
  t.like(
    mockChainStorageRoot.getBody(
      'mockChainStorageRoot.thisElectorate.latestQuestion',
    ),
    {
      issue: {
        text: 'why2',
      },
    },
  );

  const questionSpec3 = {
    ...questionSpec,
    issue: harden({ text: 'why3' }),
    closingRule: {
      timer,
      deadline: 1n,
    },
    quorumRule: QuorumRule.MAJORITY,
  };
  const { publicFacet: counterPublic } = await E(creatorFacet).addQuestion(
    counterInstallation,
    questionSpec3,
  );
  // Third question overwrites again.
  await eventLoopIteration();
  t.like(
    mockChainStorageRoot.getBody(
      'mockChainStorageRoot.thisElectorate.latestQuestion',
    ),
    {
      issue: {
        text: 'why3',
      },
    },
  );

  // We didn't add any votes. getOutcome() will eventually return a broken
  // promise, but not until some time after tick(). Add a .catch() for it.
  E(counterPublic)
    .getOutcome()
    .catch(e => t.deepEqual(e, 'No quorum'));

  await timer.tick();

  const questions = await publicFacet.getOpenQuestions();
  t.deepEqual(questions.length, 2);
});
