// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeStore } from '@agoric/store';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

import { ChoiceMethod, buildBallot } from './ballotBuilder';

const makeWeightedBallot = (ballot, shares) => ({ ballot, shares });

const makeBinaryBallot = (question, positionAName, positionBName) => {
  const positions = [];
  assert.typeof(question, 'string');
  assert.typeof(positionAName, 'string');
  assert.typeof(positionBName, 'string');
  positions.push(positionAName, positionBName);

  return buildBallot(ChoiceMethod.CHOOSE_N, question, positions, 1n);
};

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

// Exported for testing purposes
const makeBinaryBallotCounter = (
  question,
  positions,
  threshold,
  tieOutcome = undefined,
) => {
  assert(
    positions.length === 2,
    X`Binary ballots must have exactly two positions. had ${positions.length}: ${positions}`,
  );
  const [aName, bName] = positions;
  if (tieOutcome) {
    assert(
      positions.includes(tieOutcome),
      X`The default outcome on a tie must be one of the positions, not ${tieOutcome}`,
    );
  }
  const template = makeBinaryBallot(question, aName, bName);
  const ballotDetails = template.getDetails();

  assert(
    ballotDetails.method === ChoiceMethod.CHOOSE_N,
    X`Binary ballot counter only works with CHOOSE_N`,
  );
  let isOpen = true;
  const outcomePromise = makePromiseKit();
  const tallyPromise = makePromiseKit();
  const allBallots = makeStore('seat');

  const recordBallot = (seat, filledBallot, shares = 1n) => {
    assert(
      filledBallot.question === question,
      X`Ballot not for this question ${filledBallot.question} should have been ${question}`,
    );
    assert(
      positions.includes(filledBallot.chosen[0]),
      X`The ballot's choice is not a legal position: ${filledBallot.chosen[0]}.`,
    );
    allBallots.has(seat)
      ? allBallots.set(seat, makeWeightedBallot(filledBallot, shares))
      : allBallots.init(seat, makeWeightedBallot(filledBallot, shares));
  };

  const countVotes = () => {
    assert(!isOpen, X`can't count votes while the election is open`);

    // ballot template has position choices; Each ballot in allBallots should
    // match. count the valid ballots and report results.
    let spoiled = 0n;
    const tally = {
      [positions[0]]: 0n,
      [positions[1]]: 0n,
    };

    allBallots.values().forEach(({ ballot, shares }) => {
      assert(
        ballot.chosen.length === 1,
        X`A binary ballot must contain exactly one choice.`,
      );
      const choice = ballot.chosen[0];
      if (!ballotDetails.positions.includes(choice)) {
        spoiled += shares;
      } else {
        tally[choice] += shares;
      }
    });

    const stats = {
      spoiled,
      votes: allBallots.entries().length,
      results: [
        { position: positions[0], total: tally[positions[0]] },
        { position: positions[1], total: tally[positions[1]] },
      ],
    };

    if (!makeQuorumCounter(threshold).check(stats)) {
      outcomePromise.reject('No quorum');
      return;
    }

    if (tally[positions[0]] > tally[positions[1]]) {
      outcomePromise.resolve(positions[0]);
    } else if (tally[positions[1]] > tally[positions[0]]) {
      outcomePromise.resolve(positions[1]);
    } else {
      outcomePromise.resolve(tieOutcome);
    }

    tallyPromise.resolve(stats);
  };

  const sharedFacet = {
    getBallotTemplate: () => template,
    isOpen: () => isOpen,
  };

  /** @type {VoterFacet} */
  const voterFacet = Far('voterFacet', {
    submitVote: recordBallot,
  });

  /** @type {BallotCounterCreatorFacet} */
  const creatorFacet = Far('adminFacet', {
    ...sharedFacet,
    closeVoting: () => {
      isOpen = false;
      countVotes();
    },
    getVoterFacet: () => voterFacet,
  });

  /** @type {BallotCounterPublicFacet} */
  const publicFacet = Far('publicFacet', {
    ...sharedFacet,
    getOutcome: () => outcomePromise.promise,
    getStats: () => tallyPromise.promise,
  });
  return { publicFacet, creatorFacet };
};

const start = zcf => {
  // There are a variety of ways of counting quorums. The parameters must be
  // visible in the terms. We're doing a simple threshold here. If we wanted to
  // discount abstentions, we could refactor to provide the quorumCounter as a
  // component.
  // TODO(hibbert) checking the quorum should be pluggable and legible.
  const { question, positions, quorumThreshold } = zcf.getTerms();
  return makeBinaryBallotCounter(question, positions, quorumThreshold);
};

harden(start);
harden(makeBinaryBallotCounter);

export { makeBinaryBallotCounter, start };
