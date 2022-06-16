// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';
import { E } from '@endo/eventual-send';
import { buildManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';

import {
  makeBinaryVoteCounter,
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  coerceQuestionSpec,
  makeParamChangePositions,
} from '../../src/index.js';

const ISSUE = harden({ text: 'Fish or cut bait?' });
const FISH = harden({ text: 'Fish' });
const BAIT = harden({ text: 'Cut Bait' });

const { positive, negative } = makeParamChangePositions({ Arbitrary: 37 });
const PARAM_CHANGE_ISSUE = harden({
  spec: { paramPath: { key: 'governedParam' }, changes: { Whatever: 37 } },
  contract: makeHandle('Instance'),
});

const FAKE_CLOSING_RULE = {
  timer: buildManualTimer(console.log),
  deadline: 3n,
};

const FAKE_COUNTER_INSTANCE = makeHandle('Instance');

test('binary question', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [FISH, BAIT],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BAIT,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceTemplate = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  await E(creatorFacet).submitVote(aliceSeat, [alicePositions[0]]);
  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});

test('binary spoiled', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [FISH, BAIT],
    electionType: ElectionType.ELECTION,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BAIT,
  });
  const { publicFacet, creatorFacet } = makeBinaryVoteCounter(
    questionSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceTemplate = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);

  await t.throwsAsync(
    () => E(creatorFacet).submitVote(aliceSeat, [harden({ text: 'no' })]),
    {
      message: `The specified choice is not a legal position: {"text":"no"}.`,
    },
  );
});

test('binary tied', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: PARAM_CHANGE_ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.PARAM_CHANGE,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    2n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceTemplate = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = aliceTemplate.getDetails().positions;
  E(creatorFacet).submitVote(aliceSeat, [positions[0]]);
  await E(creatorFacet).submitVote(bobSeat, [positions[1]]);
  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary bad vote', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: PARAM_CHANGE_ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.PARAM_CHANGE,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { creatorFacet } = makeBinaryVoteCounter(
    questionSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceSeat = makeHandle('Voter');

  await t.throwsAsync(() => E(creatorFacet).submitVote(aliceSeat, [BAIT]), {
    message: `The specified choice is not a legal position: {"text":"Cut Bait"}.`,
  });
});

test('binary no votes', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: PARAM_CHANGE_ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.PARAM_CHANGE,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { publicFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary varying share weights', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    1n,
    FAKE_COUNTER_INSTANCE,
  );
  const aceSeat = makeHandle('Voter');
  const austinSeat = makeHandle('Voter');
  const saraSeat = makeHandle('Voter');

  await Promise.all([
    E(creatorFacet).submitVote(aceSeat, [positive], 37n),
    E(creatorFacet).submitVote(austinSeat, [negative], 24n),
    E(creatorFacet).submitVote(saraSeat, [negative], 11n),
  ]);

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, positive);
});

test('binary contested', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.ELECTION,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    3n,
    FAKE_COUNTER_INSTANCE,
  );
  const template = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 2);

  E(creatorFacet).submitVote(aliceSeat, [positions[0]], 23n);
  await E(creatorFacet).submitVote(bobSeat, [positions[1]], 47n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary revote', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: PARAM_CHANGE_ISSUE,
    positions: [positive, negative],
    electionType: ElectionType.PARAM_CHANGE,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: negative,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    5n,
    FAKE_COUNTER_INSTANCE,
  );
  const template = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 2);

  E(creatorFacet).submitVote(aliceSeat, [positions[0]], 23n);
  E(creatorFacet).submitVote(bobSeat, [positions[1]], 47n);
  await E(creatorFacet).submitVote(bobSeat, [positions[1]], 15n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, positive);
});

test('binary question too many', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [FISH, BAIT],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BAIT,
  });
  const { publicFacet, creatorFacet } = makeBinaryVoteCounter(
    questionSpec,
    1n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceTemplate = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  await t.throwsAsync(
    () => E(creatorFacet).submitVote(aliceSeat, alicePositions),
    {
      message: 'only 1 position allowed',
    },
  );
});

test('binary no quorum', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [FISH, BAIT],
    electionType: ElectionType.ELECTION,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BAIT,
  });
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryVoteCounter(
    questionSpec,
    2n,
    FAKE_COUNTER_INSTANCE,
  );
  const aliceTemplate = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');

  const positions = aliceTemplate.getDetails().positions;
  await E(creatorFacet).submitVote(aliceSeat, [positions[0]]);
  closeFacet.closeVoting();
  await E(publicFacet)
    .getOutcome()
    .then(o => t.fail(`expected to reject, not ${o}`))
    .catch(e => t.deepEqual(e, 'No quorum'));
});

test('binary too many positions', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.UNRANKED,
    issue: ISSUE,
    positions: [FISH, BAIT, harden({ text: 'sleep' })],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BAIT,
  });
  t.throws(
    () => makeBinaryVoteCounter(questionSpec, 0n, FAKE_COUNTER_INSTANCE),
    {
      message:
        'Binary questions must have exactly two positions. had 3: [{"text":"Fish"},{"text":"Cut Bait"},{"text":"sleep"}]',
    },
  );
});
