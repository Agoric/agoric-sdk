// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { makeBinaryBallotCounter } from '../../src/binaryBallotCounter.js';

const QUESTION = 'Fish or cut bait?';
const FISH = 'Fish';
const BAIT = 'Cut Bait';

test('binary ballot', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    1n,
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
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    0n,
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
        question: QUESTION,
        chosen: ['no'],
      }),
    {
      message: `The ballot's choice is not a legal position: "no".`,
    },
  );
});

test('binary tied', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    2n,
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
  t.deepEqual(outcome, undefined);
});

test('binary tied w/fallback', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    2n,
    BAIT,
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
  t.deepEqual(outcome, BAIT);
});

test('binary bad vote', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    1n,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Voter');

  t.throws(
    () => E(voterFacet).submitVote(aliceSeat, aliceTemplate.choose(['worms'])),
    {
      message:
        'Some positions in ["worms"] are not valid in ["Fish","Cut Bait"]',
    },
  );
});

test('binary counter does not match ballot', async t => {
  const { creatorFacet } = makeBinaryBallotCounter(QUESTION, [FISH, BAIT], 1n);
  const voterFacet = E(creatorFacet).getVoterFacet();
  const aliceSeat = makeHandle('Voter');

  await t.throwsAsync(
    () =>
      E(voterFacet).submitVote(aliceSeat, {
        question: 'Hop, skip or jump?',
        chosen: [FISH],
      }),
    {
      message:
        'Ballot not for this question "Hop, skip or jump?" should have been "Fish or cut bait?"',
    },
  );
  await t.throwsAsync(
    () =>
      E(voterFacet).submitVote(aliceSeat, {
        question: QUESTION,
        chosen: ['jump'],
      }),
    {
      message: `The ballot's choice is not a legal position: "jump".`,
    },
  );
});

test('binary no votes', async t => {
  const { publicFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    0n,
  );

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, undefined);
});

test('binary varying share weights', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    1n,
  );
  const voterFacet = E(creatorFacet).getVoterFacet();
  const template = publicFacet.getBallotTemplate();
  const aceSeat = makeHandle('Voter');
  const austinSeat = makeHandle('Voter');
  const saraSeat = makeHandle('Voter');

  await Promise.all([
    E(voterFacet).submitVote(aceSeat, template.choose([FISH]), 37n),
    E(voterFacet).submitVote(austinSeat, template.choose([BAIT]), 24n),
    E(voterFacet).submitVote(saraSeat, template.choose([BAIT]), 11n),
  ]);

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, 'Fish');
});

test('binary contested', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    3n,
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
  t.deepEqual(outcome, BAIT);
});

test('binary revote', async t => {
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    5n,
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
  t.deepEqual(outcome, FISH);
});

test('binary ballot too many', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    1n,
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
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    QUESTION,
    [FISH, BAIT],
    2n,
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
  t.throws(() => makeBinaryBallotCounter(QUESTION, [FISH, BAIT, 'sleep'], 1n), {
    message:
      'Binary ballots must have exactly two positions. had 3: ["Fish","Cut Bait","sleep"]',
  });
});
