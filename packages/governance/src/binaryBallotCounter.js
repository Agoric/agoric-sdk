// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeStore } from '@agoric/store';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

import { E } from '@agoric/eventual-send';
import { ChoiceMethod, buildBallot } from './ballotBuilder';
import { scheduleClose } from './closingRule';

const makeWeightedBallot = (ballot, shares) => harden({ ballot, shares });

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
  closingRule,
  instance,
) => {
  assert(
    positions.length === 2,
    X`Binary ballots must have exactly two positions. had ${positions.length}: ${positions}`,
  );
  assert.typeof(question, 'string');
  assert.typeof(positions[0], 'string');
  assert.typeof(positions[1], 'string');
  if (tieOutcome) {
    assert(
      positions.includes(tieOutcome),
      X`The default outcome on a tie must be one of the positions, not ${tieOutcome}`,
    );
  }

  const template = buildBallot(
    ChoiceMethod.CHOOSE_N,
    question,
    positions,
    1,
    instance,
  );
  const ballotDetails = template.getDetails();

  assert(
    ballotDetails.method === ChoiceMethod.CHOOSE_N,
    X`Binary ballot counter only works with CHOOSE_N`,
  );
  let isOpen = true;
  const outcomePromise = makePromiseKit();
  const tallyPromise = makePromiseKit();
  const allBallots = makeStore('seat');

  const recordBallot = (seat, filledBallotP, shares = 1n) => {
    return E.when(filledBallotP, filledBallot => {
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
    });
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
    tallyPromise.resolve(stats);

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
  };

  const closeVoting = () => {
    isOpen = false;
    countVotes();
  };

  const sharedFacet = {
    getBallotTemplate: () => template,
    isOpen: () => isOpen,
    getClosingRule: () => closingRule,
  };

  /** @type {VoterFacet} */
  const voterFacet = Far('voterFacet', {
    ...sharedFacet,
    submitVote: recordBallot,
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
  });
  return { publicFacet, creatorFacet, closeFacet };
};

const start = zcf => {
  // There are a variety of ways of counting quorums. The parameters must be
  // visible in the terms. We're doing a simple threshold here. If we wanted to
  // discount abstentions, we could refactor to provide the quorumCounter as a
  // component.
  // TODO(hibbert) checking the quorum should be pluggable and legible.
  const {
    question,
    positions,
    quorumThreshold,
    tieOutcome,
    closingRule,
  } = zcf.getTerms();

  // The closeFacet is exposed for testing, but doesn't escape from a contract
  const { publicFacet, creatorFacet, closeFacet } = makeBinaryBallotCounter(
    question,
    positions,
    quorumThreshold,
    tieOutcome,
    closingRule,
    zcf.getInstance(),
  );

  scheduleClose(closingRule, closeFacet.closeVoting);

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
