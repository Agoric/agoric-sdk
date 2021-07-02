// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { q } from '@agoric/assert';
import { makeBinaryBallotCounter } from '../../src/binaryBallotCounter';
import {
  makeBallotSpec,
  ChoiceMethod,
  ElectionType,
  QuorumRule,
} from '../../src/ballotBuilder';
import { makeParamChangePositions } from '../../src/governParam';

const QUESTION = harden({ text: 'Fish or cut bait?' });
const FISH = harden({ text: 'Fish' });
const BAIT = harden({ text: 'Cut Bait' });

const PARAM_CHANGE_SPEC = { parameterName: 'arbitrary', key: 'simple' };
const { positive, negative } = makeParamChangePositions(PARAM_CHANGE_SPEC, 37);
const PARAM_CHANGE_QUESTION = harden({
  paramSpec: PARAM_CHANGE_SPEC,
  contract: makeHandle('Instance'),
  proposedValue: 37,
});

const FAKE_CLOSING_RULE = {
  timer: buildManualTimer(console.log),
  deadline: 3n,
};

const FAKE_COUNTER_INSTANCE = makeHandle('Instance');

test('binary ballot', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [FISH, BAIT],
    ElectionType.SURVEY,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    BAIT,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  await E(voterFacet).submitVote(
    aliceSeat,
    aliceTemplate.choose([alicePositions[0]]),
  );
  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});

test('binary spoiled', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [FISH, BAIT],
    ElectionType.ELECTION,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    BAIT,
  );
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    ballotSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);

  await t.throwsAsync(
    () =>
      E(voterFacet).submitVote(aliceSeat, {
        ...aliceTemplate.choose([alicePositions[0]]),
        chosen: ['no'],
      }),
    {
      message: `The ballot's choice is not a legal position: "no".`,
    },
  );
});

test('binary tied', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    PARAM_CHANGE_QUESTION,
    [positive, negative],
    ElectionType.PARAM_CHANGE,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    2n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = aliceTemplate.getDetails().positions;
  E(voterFacet).submitVote(aliceSeat, aliceTemplate.choose([positions[0]]));
  await E(voterFacet).submitVote(bobSeat, aliceTemplate.choose([positions[1]]));
  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary bad vote', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    PARAM_CHANGE_QUESTION,
    [positive, negative],
    ElectionType.PARAM_CHANGE,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    ballotSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  t.throws(
    () => E(voterFacet).submitVote(aliceSeat, aliceTemplate.choose([BAIT])),
    {
      message: `Some positions in ${q([
        BAIT,
      ])} are not valid in [{"changeParam":{"parameterName":"arbitrary","key":"simple"},"proposedValue":37},{"noChange":"[Seen]"}]`,
    },
  );
});

test('binary counter does not match ballot', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    PARAM_CHANGE_QUESTION,
    [positive, negative],
    ElectionType.PARAM_CHANGE,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    ballotSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceSeat = makeHandle('Voter');
  const aliceTemplate = publicFacet.getBallotTemplate();

  const ballot = {
    ...aliceTemplate.choose([negative]),
    handle: makeHandle('Ballot'),
  };

  await t.throwsAsync(() => E(voterFacet).submitVote(aliceSeat, ballot), {
    message: 'Ballot not for this question; wrong handle',
  });
  await t.throwsAsync(
    () =>
      E(voterFacet).submitVote(aliceSeat, {
        ...aliceTemplate.choose([negative]),
        chosen: ['jump'],
      }),
    {
      message: `The ballot's choice is not a legal position: "jump".`,
    },
  );
});

test('binary no votes', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    PARAM_CHANGE_QUESTION,
    [positive, negative],
    ElectionType.PARAM_CHANGE,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    0n,
    FAKE_COUNTER_INSTANCE,
  );

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary varying share weights', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [positive, negative],
    ElectionType.SURVEY,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    1n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const template = publicFacet.getBallotTemplate();
  const aceSeat = makeHandle('Voter');
  const austinSeat = makeHandle('Voter');
  const saraSeat = makeHandle('Voter');

  await Promise.all([
    E(voterFacet).submitVote(aceSeat, template.choose([positive]), 37n),
    E(voterFacet).submitVote(austinSeat, template.choose([negative]), 24n),
    E(voterFacet).submitVote(saraSeat, template.choose([negative]), 11n),
  ]);

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, positive);
});

test('binary contested', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [positive, negative],
    ElectionType.ELECTION,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    3n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 2);

  E(voterFacet).submitVote(aliceSeat, template.choose([positions[0]]), 23n);
  await E(voterFacet).submitVote(bobSeat, template.choose([positions[1]]), 47n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, negative);
});

test('binary revote', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    PARAM_CHANGE_QUESTION,
    [positive, negative],
    ElectionType.PARAM_CHANGE,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    negative,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    5n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 2);

  E(voterFacet).submitVote(aliceSeat, template.choose([positions[0]]), 23n);
  E(voterFacet).submitVote(bobSeat, template.choose([positions[1]]), 47n);
  await E(voterFacet).submitVote(bobSeat, template.choose([positions[1]]), 15n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, positive);
});

test('binary ballot too many', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [FISH, BAIT],
    ElectionType.SURVEY,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    BAIT,
  );
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    ballotSpec,
    1n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  const alicePositions = aliceTemplate.getDetails().positions;
  t.throws(
    () =>
      E(voterFacet).submitVote(aliceSeat, aliceTemplate.choose(alicePositions)),
    {
      message: 'only 1 position(s) allowed',
    },
  );
});

test('binary no quorum', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [FISH, BAIT],
    ElectionType.ELECTION,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    BAIT,
  );
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    2n,
    FAKE_COUNTER_INSTANCE,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  const positions = aliceTemplate.getDetails().positions;
  await E(voterFacet).submitVote(
    aliceSeat,
    aliceTemplate.choose([positions[0]]),
  );
  closeFacet.closeVoting();
  await E(publicFacet)
    .getOutcome()
    .then(o => t.fail(`expected to reject, not ${o}`))
    .catch(e => t.deepEqual(e, 'No quorum'));
});

test('binary too many positions', async t => {
  const ballotSpec = makeBallotSpec(
    ChoiceMethod.CHOOSE_N,
    QUESTION,
    [FISH, BAIT, harden({ text: 'sleep' })],
    ElectionType.SURVEY,
    1,
    FAKE_CLOSING_RULE,
    QuorumRule.NONE,
    BAIT,
  );
  t.throws(
    () => makeBinaryBallotCounter(ballotSpec, 0n, FAKE_COUNTER_INSTANCE),
    {
      message:
        'Binary ballots must have exactly two positions. had 3: [{"text":"Fish"},{"text":"Cut Bait"},{"text":"sleep"}]',
    },
  );
});
