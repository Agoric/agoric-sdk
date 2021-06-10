// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { Far } from '@agoric/marshal';
import { makeBinaryBallotCounter } from '../../src/binaryBallotCounter';

const QUESTION = 'Fish or cut bait?';
const FISH = 'Fish';
const BAIT = 'Cut Bait';

const makeThreshold = seats => {
  const check = stats => {
    const votes = stats.results.reduce(
      (runningTotal, { total }) => runningTotal + total,
      0n,
    );
    return votes >= seats;
  };
  return Far('checker', { check });
};

test('binary ballot', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  creatorFacet.submitVote(aliceSeat, aliceTemplate.choose(alicePositions[0]));
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(1n));
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});

test('binary spoiled', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], FISH);
  creatorFacet.submitVote(aliceSeat, {
    question: QUESTION,
    chosen: ['no'],
  });
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(0n));
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
  const tally = await E(publicFacet).getStats();
  t.deepEqual(tally.spoiled, 1n);
});

test('binary tied', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = aliceTemplate.getPositions();
  creatorFacet.submitVote(aliceSeat, aliceTemplate.choose(positions[0]));
  creatorFacet.submitVote(bobSeat, aliceTemplate.choose(positions[1]));
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(2n));
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
});

test('binary bad vote', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  t.throws(
    () => creatorFacet.submitVote(aliceSeat, aliceTemplate.choose('worms')),
    {
      message: 'Not a valid position: "worms"',
    },
  );
});

test('binary no votes', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );

  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(0n));
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, "It's a tie!");
});

test('binary still open', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], 'Fish');
  creatorFacet.submitVote(aliceSeat, aliceTemplate.choose(alicePositions[0]));
  await t.throwsAsync(() => creatorFacet.countVotes(makeThreshold(1n)), {
    message: `can't count votes while the election is open`,
  });
});

test('binary weights', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.deepEqual(alicePositions.length, 2);
  t.deepEqual(alicePositions[0], 'Fish');
  creatorFacet.submitVote(
    aliceSeat,
    aliceTemplate.choose(alicePositions[0]),
    37n,
  );
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(1n));
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, 'Fish');
});

test('binary contested', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = template.getPositions();
  t.deepEqual(positions.length, 2);

  creatorFacet.submitVote(aliceSeat, template.choose(positions[0]), 23n);
  creatorFacet.submitVote(bobSeat, template.choose(positions[1]), 47n);
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(3n));

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, BAIT);
});

test('binary revote', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const template = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');
  const bobSeat = makeHandle('Seat');

  const positions = template.getPositions();
  t.deepEqual(positions.length, 2);

  creatorFacet.submitVote(aliceSeat, template.choose(positions[0]), 23n);
  creatorFacet.submitVote(bobSeat, template.choose(positions[1]), 47n);
  creatorFacet.submitVote(bobSeat, template.choose(positions[1]), 15n);
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(5n));

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);
});

test('binary ballot too many', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const alicePositions = aliceTemplate.getPositions();
  t.throws(
    () =>
      creatorFacet.submitVote(
        aliceSeat,
        aliceTemplate.choose(...alicePositions),
      ),
    {
      message: 'only 1 position(s) allowed',
    },
  );
});

test('binary no quorum', async t => {
  const { publicFacet, creatorFacet } = makeBinaryBallotCounter(
    QUESTION,
    FISH,
    BAIT,
  );
  const aliceTemplate = publicFacet.getBallotTemplate();
  const aliceSeat = makeHandle('Seat');

  const positions = aliceTemplate.getPositions();
  creatorFacet.submitVote(aliceSeat, aliceTemplate.choose(positions[0]));
  creatorFacet.closeVoting();
  creatorFacet.countVotes(makeThreshold(2n));
  await E(publicFacet)
    .getOutcome()
    .then(o => t.fail(`expected to reject, not ${o}`))
    .catch(e => t.deepEqual(e, 'No quorum'));
});
