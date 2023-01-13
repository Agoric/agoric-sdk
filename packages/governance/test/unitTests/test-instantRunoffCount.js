import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeStoredPublishKit } from '@agoric/notifier';
import {
  eventLoopIteration,
  makeFakeMarshaller,
} from '@agoric/notifier/tools/testSupports.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  ChoiceMethod,
  coerceQuestionSpec,
  ElectionType,
  QuorumRule,
} from '../../src/index.js';
import { makeInstantRunoffVoteCounter } from '../../src/instantRunoffVoteCounter.js';

const SIMPLE_ISSUE = harden({
  text: 'Fish or Beef or Pork or Chicken or Duck?',
});
const FISH = harden({ text: 'Fish' });
const BEEF = harden({ text: 'Beef' });
const PORK = harden({ text: 'Pork' });
const GOAT = harden({ text: 'Goat' });

const FAKE_CLOSING_RULE = {
  timer: buildManualTimer(console.log),
  deadline: 3n,
};

const FAKE_COUNTER_INSTANCE = makeHandle('Instance');

const makePublisherFromFakes = () => {
  const storageRoot = makeMockChainStorageRoot();
  const publishKit = makeStoredPublishKit(storageRoot, makeFakeMarshaller());
  return { publisher: publishKit.publisher, storageRoot };
};

const prepareIrvElection = ({
  positions,
  winningThreshold,
  tieOutcome,
  quorumThreshold = 0n,
  maxChoices = 0n,
}) => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.ORDER,
    issue: SIMPLE_ISSUE,
    positions,
    electionType: ElectionType.SURVEY,
    maxChoices: maxChoices || positions.length,
    maxWinners: 1,
    winningThreshold,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome,
  });
  const { publisher, storageRoot } = makePublisherFromFakes();
  const { publicFacet, creatorFacet, closeFacet } =
    makeInstantRunoffVoteCounter(
      questionSpec,
      quorumThreshold,
      FAKE_COUNTER_INSTANCE,
      publisher,
    );

  return { publicFacet, creatorFacet, closeFacet, storageRoot };
};

const submitVotes = (creatorFacet, voteWithSharesArr) => {
  return Promise.all(
    voteWithSharesArr.map(([choice, shares], idx) => {
      const seat = makeHandle(`Voter ${idx}`);
      return E(creatorFacet).submitVote(seat, choice, shares);
    }),
  );
};

test('instant run-off, 1 round', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 4n,
      tieOutcome: BEEF,
    });
  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF, PORK], 2n],
    [[FISH, BEEF], 3n],
    [[BEEF, FISH], 4n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);

  const stats = await E(publicFacet).getStats();

  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 3,
    results: [
      { position: FISH, total: 5n, details: [5n] },
      { position: BEEF, total: 4n, details: [4n] },
      { position: PORK, total: 0n, details: [0n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: FISH,
  });
});

test('instant run-off, multiple rounds #1', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 50n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 36n],
    [[BEEF, FISH], 10n],
    [[BEEF, PORK], 20n],
    [[PORK, BEEF], 34n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, PORK);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 4,
    results: [
      { position: FISH, total: 46n, details: [36n, 10n] },
      { position: BEEF, total: 30n, details: [30n] },
      { position: PORK, total: 54n, details: [34n, 20n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: PORK,
  });
});

test('instant run-off, multiple rounds #2', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK, GOAT],
      winningThreshold: 60n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 4);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 36n],
    [[BEEF, FISH], 10n],
    [[BEEF, PORK], 20n],
    [[GOAT, PORK, BEEF], 20n],
    [[PORK, BEEF], 34n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, PORK);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 5,
    results: [
      { position: FISH, total: 46n, details: [36n, 0n, 10n] },
      { position: BEEF, total: 30n, details: [30n, 0n] },
      { position: PORK, total: 74n, details: [34n, 20n, 20n] },
      { position: GOAT, total: 20n, details: [20n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: PORK,
  });
});

test('instant run-off, batch elminiation', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK, GOAT],
      winningThreshold: 60n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 4);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 36n],
    [[BEEF, FISH], 10n],
    [[BEEF, PORK], 10n],
    [[GOAT, PORK, BEEF], 20n],
    [[PORK, BEEF], 34n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, PORK);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 5,
    results: [
      // beef and goal are eliminated at once, so they only have 1 history entry
      { position: FISH, total: 46n, details: [36n, 10n] },
      { position: BEEF, total: 20n, details: [20n] },
      { position: PORK, total: 64n, details: [34n, 30n] },
      { position: GOAT, total: 20n, details: [20n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: PORK,
  });
});

test('instant run-off, no winning-threshold', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 0n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 36n],
    [[BEEF, FISH], 10n],
    [[BEEF, PORK], 10n],
    [[PORK, BEEF], 34n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 4,
    results: [
      // still a win
      { position: FISH, total: 46n, details: [36n, 10n] },
      { position: BEEF, total: 20n, details: [20n] },
      { position: PORK, total: 44n, details: [34n, 10n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: FISH,
  });
});

test('instant run-off, tie break by vote history', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 50n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF, PORK], 35n],
    [[BEEF, FISH, PORK], 15n],
    [[BEEF, PORK, FISH], 14n],
    [[PORK, BEEF, FISH], 36n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, PORK);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 4,
    results: [
      // fish win for having higher first-preferential votes
      { position: FISH, total: 50n, details: [35n, 15n] },
      { position: BEEF, total: 29n, details: [29n] },
      { position: PORK, total: 50n, details: [36n, 14n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: PORK,
  });
});

test('instant run-off, tie break by shuffling', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 50n,
      tieOutcome: BEEF,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 35n],
    [[BEEF, FISH], 15n],
    [[BEEF, PORK], 15n],
    [[PORK, BEEF], 35n],
  ]);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.assert(outcome === PORK || outcome === FISH);

  const stats = await E(publicFacet).getStats();
  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 4,
    results: [
      { position: FISH, total: 50n, details: [35n, 15n] },
      { position: BEEF, total: 30n, details: [30n] },
      { position: PORK, total: 50n, details: [35n, 15n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
  });
});

test('instant run-off, revote, empty redistributed ballots', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 0n,
      tieOutcome: BEEF,
    });
  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  const seat = makeHandle('Voter');

  await E(creatorFacet).submitVote(seat, [BEEF, PORK], 2n);
  await submitVotes(creatorFacet, [
    [[FISH, BEEF], 3n],
    [[BEEF, FISH], 4n],
  ]);

  await E(creatorFacet).submitVote(seat, [FISH, BEEF, PORK], 2n);
  await E(closeFacet).closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, FISH);

  const stats = await E(publicFacet).getStats();

  t.deepEqual(stats, {
    spoiled: 0n,
    votes: 3,
    results: [
      { position: FISH, total: 5n, details: [5n, 0n] },
      { position: BEEF, total: 4n, details: [4n, 0n] },
      { position: PORK, total: 0n, details: [0n] },
    ],
  });

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: FISH,
  });
});

test('instant run-off, no votes', async t => {
  const { publicFacet, closeFacet, storageRoot } = prepareIrvElection({
    positions: [FISH, BEEF, PORK],
    winningThreshold: 50n,
    tieOutcome: BEEF,
  });

  const question = publicFacet.getQuestion();

  const { positions, tieOutcome } = question.getDetails();
  t.deepEqual(positions.length, 3);

  closeFacet.closeVoting();
  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, tieOutcome);

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: tieOutcome,
  });
});

test('instant run-off, no quorum', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 50n,
      tieOutcome: BEEF,
      quorumThreshold: 3n,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  await submitVotes(creatorFacet, [
    [[FISH], 2n],
    [[PORK], 3n],
  ]);
  closeFacet.closeVoting();

  await E(publicFacet)
    .getOutcome()
    .then(o => t.fail(`expected to reject, not ${o}`))
    .catch(e => t.deepEqual(e, 'No quorum'));

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'fail',
    reason: 'No quorum',
  });
});

test('instant run-off, bad vote', async t => {
  const { publicFacet, creatorFacet, closeFacet, storageRoot } =
    prepareIrvElection({
      positions: [FISH, BEEF, PORK],
      winningThreshold: 50n,
      tieOutcome: BEEF,
      quorumThreshold: 3n,
      maxChoices: 2n,
    });

  const question = publicFacet.getQuestion();

  const { positions } = question.getDetails();
  t.deepEqual(positions.length, 3);

  const seat = makeHandle('Voter');

  await t.throwsAsync(() => E(creatorFacet).submitVote(seat, [GOAT]), {
    message: `The specified choice is not a legal position: {"text":"Goat"}.`,
  });

  await t.throwsAsync(() => E(creatorFacet).submitVote(seat, [FISH, FISH]), {
    message: `Duplicated position(s) found.`,
  });

  await t.throwsAsync(
    () => E(creatorFacet).submitVote(seat, [FISH, BEEF, PORK]),
    {
      message: `The number of choices exceeds maxChoices: 2.`,
    },
  );

  closeFacet.closeVoting();

  await E(publicFacet)
    .getOutcome()
    .then(o => t.fail(`expected to reject, not ${o}`))
    .catch(e => t.deepEqual(e, 'No quorum'));

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'fail',
    reason: 'No quorum',
  });
});
