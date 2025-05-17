import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { makeZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';
import path from 'path';

import {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  coerceQuestionSpec,
} from '../../src/index.js';
import { documentStorageSchema } from '../../tools/storageDoc.js';
import { remoteNullMarshaller } from '../swingsetTests/utils.js';

/**
 * @import {SimpleIssue} from '../../src/types.js';
 */

const dirname = path.dirname(new URL(import.meta.url).pathname);

const electorateRoot = `${dirname}/../../src/committee.js`;
const counterRoot = `${dirname}/../../src/binaryVoteCounter.js`;

const setupContract = async (
  terms = { committeeName: 'illuminati', committeeSize: 13 },
) => {
  const zoe = makeZoeForTest();

  const mockChainStorageRoot = makeMockChainStorageRoot();

  // pack the contract
  const [electorateBundle, counterBundle] = await Promise.all([
    bundleSource(electorateRoot),
    bundleSource(counterRoot),
  ]);
  // install the contract
  /** @typedef {Installation<import('../../src/committee.js')['start']>} CommitteInstallation */
  /** @typedef {Installation<import('../../src/binaryVoteCounter.js').start>} CounterInstallation */
  /** @type {[CommitteInstallation, CounterInstallation] } */
  const [electorateInstallation, counterInstallation] = await Promise.all([
    E(zoe).install(electorateBundle),
    E(zoe).install(counterBundle),
  ]);
  const electorateStartResult = await E(zoe).startInstance(
    electorateInstallation,
    {},
    terms,
    {
      storageNode: mockChainStorageRoot.makeChildNode('thisElectorate'),
      marshaller: remoteNullMarshaller,
    },
  );

  return {
    counterInstallation,
    electorateStartResult,
    mockChainStorageRoot,
    zoe,
  };
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
  const questionSpec = coerceQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue: { text: 'why' },
      positions,
      electionType: ElectionType.SURVEY,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: {
        timer: buildZoeManualTimer(t.log),
        deadline: 2n,
      },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: positions[1],
    }),
  );
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
        timer: Far('ManualTimer'),
      },
      counterInstance: Far('InstanceHandle'),
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
      questionHandle: Far('QuestionHandle'),
      quorumRule: 'majority',
      tieOutcome: {
        text: 'why not?',
      },
    },
  );
});

test('committee-open question:mixed, with snapshot', async t => {
  const {
    electorateStartResult: { creatorFacet, publicFacet },
    counterInstallation,
    mockChainStorageRoot,
  } = await setupContract();

  const timer = buildZoeManualTimer(t.log);
  const positions = [harden({ text: 'because' }), harden({ text: 'why not?' })];
  const questionSpec = coerceQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue: { text: 'why' },
      positions,
      electionType: ElectionType.SURVEY,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: { timer, deadline: 4n },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: positions[1],
    }),
  );
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

  const doc = {
    node: 'committees.Economic_Committee',
    owner: 'a committee contract',
    pattern: 'mockChainStorageRoot.thisElectorate.',
    replacement: 'published.committees.Economic_Committee.',
  };
  await documentStorageSchema(t, mockChainStorageRoot, doc);
});

const setUpVoterAndVote = async (invitation, zoe, qHandle, choice) => {
  const seat = E(zoe).offer(invitation);
  const { voter } = E.get(E(seat).getOfferResult());
  return E(voter).castBallotFor(qHandle, [choice]);
};

test('committee-tie outcome', async t => {
  const {
    electorateStartResult: { creatorFacet },
    counterInstallation: counter,
    zoe,
  } = await setupContract({ committeeName: 'halfDozen', committeeSize: 6 });

  const timer = buildZoeManualTimer(t.log);

  const positions = [harden({ text: 'guilty' }), harden({ text: 'innocent' })];
  const questionSpec = coerceQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue: { text: 'guilt' },
      positions,
      electionType: ElectionType.SURVEY,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: {
        timer,
        deadline: 2n,
      },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: positions[1],
    }),
  );

  const qResult = await E(creatorFacet).addQuestion(counter, questionSpec);

  const invites = await E(creatorFacet).getVoterInvitations();
  const votes = [];
  for (const i of [...Array(6).keys()]) {
    votes.push(
      setUpVoterAndVote(
        invites[i],
        zoe,
        qResult.questionHandle,
        positions[i % 2],
      ),
    );
  }

  await Promise.all(votes);
  await E(timer).tick();
  await E(timer).tick();

  // if half vote each way, the tieOutcome prevails
  await E.when(E(qResult.publicFacet).getOutcome(), async outcomes =>
    t.deepEqual(outcomes, {
      text: 'innocent',
    }),
  );
});

test('committee-half vote', async t => {
  const {
    electorateStartResult: { creatorFacet },
    counterInstallation: counter,
    zoe,
  } = await setupContract({ committeeName: 'halfDozen', committeeSize: 6 });

  const timer = buildZoeManualTimer(t.log);

  const positions = [harden({ text: 'guilty' }), harden({ text: 'innocent' })];
  const questionSpec = coerceQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue: { text: 'guilt' },
      positions,
      electionType: ElectionType.SURVEY,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: {
        timer,
        deadline: 2n,
      },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: positions[1],
    }),
  );

  const qResult = await E(creatorFacet).addQuestion(counter, questionSpec);

  const invites = await E(creatorFacet).getVoterInvitations();
  const votes = [];
  for (const i of [...Array(3).keys()]) {
    votes.push(
      setUpVoterAndVote(invites[i], zoe, qResult.questionHandle, positions[0]),
    );
  }

  await Promise.all(votes);
  await E(timer).tick();
  await E(timer).tick();

  // if only half the voters vote, there is no quorum
  await E.when(
    E(qResult.publicFacet).getOutcome(),
    async _outcomes => {
      t.fail('expect no quorum');
    },
    e => {
      t.is(e, 'No quorum');
    },
  );
});

test('committee-half plus one vote', async t => {
  const {
    electorateStartResult: { creatorFacet },
    counterInstallation: counter,
    zoe,
  } = await setupContract({ committeeName: 'halfDozen', committeeSize: 6 });

  const timer = buildZoeManualTimer(t.log);

  const positions = [harden({ text: 'guilty' }), harden({ text: 'innocent' })];
  const questionSpec = coerceQuestionSpec(
    harden({
      method: ChoiceMethod.UNRANKED,
      issue: { text: 'guilt' },
      positions,
      electionType: ElectionType.SURVEY,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: {
        timer,
        deadline: 2n,
      },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: positions[1],
    }),
  );

  const qResult = await E(creatorFacet).addQuestion(counter, questionSpec);

  const invites = await E(creatorFacet).getVoterInvitations();
  const votes = [];
  for (const i of [...Array(4).keys()]) {
    votes.push(
      setUpVoterAndVote(invites[i], zoe, qResult.questionHandle, positions[0]),
    );
  }

  await Promise.all(votes);
  await E(timer).tick();
  await E(timer).tick();

  await E.when(E(qResult.publicFacet).getOutcome(), async outcomes =>
    t.deepEqual(outcomes, {
      text: 'guilty',
    }),
  );
});
