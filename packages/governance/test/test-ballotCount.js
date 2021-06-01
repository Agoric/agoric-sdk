// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { makeBinaryBallotCounter } from '../src/binaryBallotCounter';

const QUESTION = 'Fish or cut bait?';
const FISH = 'Fish';
const BAIT = 'Cut Bait';

test('binary ballot', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  adminFacet.submitVote(aliceSeat, aliceTemplate.choose(alicePositions[0]));
  adminFacet.closeVoting();
  adminFacet.countVotes();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});

test('binary spoiled', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  adminFacet.submitVote(aliceSeat, {
    question: QUESTION,
    chosen: ['no'],
  });
  adminFacet.closeVoting();
  adminFacet.countVotes();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
  const tally = await E(publicFacet).getStats();
  t.deepEqual(tally.spoiled, 1n);
});

test('binary tied', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = aliceTemplate.getPositions();
  adminFacet.submitVote(aliceSeat, aliceTemplate.choose(positions[0]));
  adminFacet.submitVote(bobSeat, aliceTemplate.choose(positions[1]));
  adminFacet.closeVoting();
  adminFacet.countVotes();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
});

test('binary bad vote', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  t.throws(
    () => adminFacet.submitVote(aliceSeat, aliceTemplate.choose('worms')),
    {
      message: 'Not a valid position: "worms"',
    },
  );
});

test('binary no votes', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );

  adminFacet.closeVoting();
  adminFacet.countVotes();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
});

test('binary still open', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], 'Fish');
  adminFacet.submitVote(aliceSeat, aliceTemplate.choose(alicePositions[0]));
  t.throws(() => adminFacet.countVotes(), {
    message: `can't count votes while the election is open`,
  });
});

test('binary weights', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], 'Fish');
  adminFacet.submitVote(
    aliceSeat,
    aliceTemplate.choose(alicePositions[0]),
    37n,
  );
  adminFacet.closeVoting();
  adminFacet.countVotes();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, 'Fish');
});

test('binary contested', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = template.getPositions();
  t.deepEqual(positions.length, 2);

  adminFacet.submitVote(aliceSeat, template.choose(positions[0]), 23n);
  adminFacet.submitVote(bobSeat, template.choose(positions[1]), 47n);
  adminFacet.closeVoting();
  adminFacet.countVotes();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, BAIT);
});

test('binary revote', async t => {
  const { publicFacet, adminFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = template.getPositions();
  t.deepEqual(positions.length, 2);

  adminFacet.submitVote(aliceSeat, template.choose(positions[0]), 23n);
  adminFacet.submitVote(bobSeat, template.choose(positions[1]), 47n);
  adminFacet.submitVote(bobSeat, template.choose(positions[1]), 15n);
  adminFacet.closeVoting();
  adminFacet.countVotes();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});
