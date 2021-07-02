// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far, passStyleOf } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { sameStructure } from '@agoric/same-structure';
import { makeStore } from '@agoric/store';

import {
  ChoiceMethod,
  buildBallot,
  verifyQuestionFormat,
  positionIncluded,
} from './ballotBuilder';
import { scheduleClose } from './closingRule';

const makeWeightedBallot = (ballot, shares) => ({ ballot, shares });

const makeQuorumCounter = quorumThreshold => {
  const check = stats => {
    const votes = stats.results.reduce(
      (runningTotal, { total }) => runningTotal + total,
      0n,
    );
    return votes >= quorumThreshold;
  };
  /** @type {QuorumCounter} */
  return Far('checker', { check });
};

const validateBinaryBallotSpec = ballotSpec => {
  const positions = ballotSpec.positions;
  assert(
    positions.length === 2,
    X`Binary ballots must have exactly two positions. had ${positions.length}: ${positions}`,
  );
  assert(
    ballotSpec.maxChoices <= positions.length,
    X`Choices must not exceed length`,
  );
  assert(
    positions.every(
      p => passStyleOf(p) === 'copyRecord',
      X`positions must be records`,
    ),
  );

  verifyQuestionFormat(ballotSpec.electionType, ballotSpec.question);

  assert(
    positions.every(
      p => passStyleOf(p) === 'copyRecord',
      X`positions must be records`,
    ),
  );

  assert(
    ballotSpec.maxChoices === 1,
    X`Can only choose 1 item on a binary ballot`,
  );
  assert(
    ballotSpec.method === ChoiceMethod.CHOOSE_N,
    X`${ballotSpec.method} must be CHOOSE_N`,
  );
  assert(
    positionIncluded(positions, ballotSpec.tieOutcome),
    X`The default outcome on a tie must be one of the positions, not ${ballotSpec.tieOutcome}`,
  );

  // We don't check the quorumRule or quorumThreshold here. The quorumThreshold
  // is provided by the Registrar that creates this ballotCounter, since only it
  // can translate the quorumRule to a required number of votes.
};

// Notice that BinaryBallotCounter is designed to run as a Zoe contract. The
// business part of the contract is extracted here so it can be tested
// independently. The standard Zoe start function is at the bottom of this file.

/** @type {BuildBallotCounter} */
const makeBinaryBallotCounter = (ballotSpec, threshold, instance) => {
  validateBinaryBallotSpec(ballotSpec);

  const ballot = buildBallot(ballotSpec, instance);
  const details = ballot.getDetails();
  const { handle } = details;

  let isOpen = true;
  const positions = ballotSpec.positions;
  const outcomePromise = makePromiseKit();
  const tallyPromise = makePromiseKit();
  // The Registrar is responsible for creating a unique seat for each voter.
  // This ballotCounter allows voters to re-vote, and replaces their previous
  // choice with the new selection.
  const allBallots = makeStore('seat');

  const submitVote = (seat, filledBallotP, shares = 1n) => {
    return E.when(filledBallotP, filledBallot => {
      assert(
        filledBallot.handle === handle,
        X`Ballot not for this question; wrong handle`,
      );
      assert(
        positionIncluded(positions, filledBallot.chosen[0]),
        X`The ballot's choice is not a legal position: ${filledBallot.chosen[0]}.`,
      );
      const finalBallot = makeWeightedBallot(filledBallot, shares);
      allBallots.has(seat)
        ? allBallots.set(seat, finalBallot)
        : allBallots.init(seat, finalBallot);
    });
  };

  const countVotes = () => {
    assert(!isOpen, X`can't count votes while the election is open`);

    // ballot template has position choices; Each ballot in allBallots should
    // match. count the valid ballots and report results.
    let spoiled = 0n;
    const tally = [0n, 0n];

    allBallots.values().forEach(({ ballot: b, shares }) => {
      assert(
        b.chosen.length === 1,
        X`A binary ballot must contain exactly one choice.`,
      );

      const choice = positions.findIndex(p => sameStructure(p, b.chosen[0]));
      if (choice < 0) {
        spoiled += shares;
      } else {
        tally[choice] += shares;
      }
    });

    const stats = {
      spoiled,
      votes: allBallots.entries().length,
      results: [
        { position: positions[0], total: tally[0] },
        { position: positions[1], total: tally[1] },
      ],
    };
    tallyPromise.resolve(stats);

    if (!makeQuorumCounter(threshold).check(stats)) {
      outcomePromise.reject('No quorum');
      return;
    }

    if (tally[0] > tally[1]) {
      outcomePromise.resolve(positions[0]);
    } else if (tally[1] > tally[0]) {
      outcomePromise.resolve(positions[1]);
    } else {
      outcomePromise.resolve(ballotSpec.tieOutcome);
    }
  };

  const closeVoting = () => {
    isOpen = false;
    countVotes();
  };

  const sharedFacet = {
    getBallotTemplate: () => ballot,
    getBallotDetails: () => details,
    isOpen: () => isOpen,
  };

  /** @type {VoterFacet} */
  const voterFacet = Far('voterFacet', {
    ...sharedFacet,
    submitVote,
  });

  // exposed for testing. In contracts, shouldn't be released.
  const closeFacet = Far('closeFacet', { closeVoting });

  /** @type {BallotCounterCreatorFacet} */
  const creatorFacet = Far('adminFacet', {
    ...sharedFacet,
    getVoterFacet: () => voterFacet,
  });

  const publicFacet = Far('preliminaryPublicFacet', {
    ...sharedFacet,
    getOutcome: () => outcomePromise.promise,
    getStats: () => tallyPromise.promise,
    getDetails: () => details,
  });
  return { publicFacet, creatorFacet, closeFacet };
};

// The contract wrapper extracts the terms and runs makeBinaryBallotCounter().
// It schedules the closing of the vote, finally inserting the contract
// instance in the publicFacet before returning public and creator facets.

const start = zcf => {
  // There are a variety of ways of counting quorums. The parameters must be
  // visible in the terms. We're doing a simple threshold here. If we wanted to
  // discount abstentions, we could refactor to provide the quorumCounter as a
  // component.
  // TODO(hibbert) checking the quorum should be pluggable and legible.
  const { ballotSpec, quorumThreshold } = zcf.getTerms();
  // The closeFacet is exposed for testing, but doesn't escape from a contract
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    ballotSpec,
    quorumThreshold,
    zcf.getInstance(),
  );

  scheduleClose(ballotSpec.closingRule, closeFacet.closeVoting);

  /** @type {BallotCounterPublicFacet} */
  const publicFacetWithGetInstance = Far('publicFacet', {
    ...publicFacet,
    getInstance: zcf.getInstance,
  });
  return { publicFacet: publicFacetWithGetInstance, creatorFacet };
};

harden(start);
harden(makeBinaryBallotCounter);

export { makeBinaryBallotCounter, start };
