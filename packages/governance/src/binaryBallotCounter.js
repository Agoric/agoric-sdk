// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeStore } from '@agoric/store';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

import { ChoiceMethod, buildBallot } from './ballotBuilder';

const makeWeightedBallot = (ballot, weight) => ({ ballot, weight });

const makeBinaryBallot = (question, positionAName, positionBName) => {
  const positions = [];
  assert.typeof(positionAName, 'string');
  assert.typeof(positionBName, 'string');
  positions.push(positionAName, positionBName);

  return buildBallot(ChoiceMethod.CHOOSE_N, question, positions);
};

const makeBinaryBallotCounter = (question, aName, bName) => {
  const template = makeBinaryBallot(question, aName, bName);

  assert(
    template.getMethod() === ChoiceMethod.CHOOSE_N,
    X`Binary ballot counter only works with CHOOSE_N`,
  );
  let isOpen = true;
  const outcomePromise = makePromiseKit();
  const tallyPromise = makePromiseKit();
  const allBallots = makeStore('seat');

  // TODO: quorum: by weight, by proportion
  const quorum = true;

  const recordBallot = (seat, filledBallot, weight = 1n) => {
    allBallots.has(seat)
      ? allBallots.set(seat, makeWeightedBallot(filledBallot, weight))
      : allBallots.init(seat, makeWeightedBallot(filledBallot, weight));
  };

  const countVotes = () => {
    assert(!isOpen, X`can't count votes while the election is open`);

    // ballot template has position choices; Each ballot in allBallots should
    // match. count the valid ballots and report results.
    const [positionA, positionB] = template.getPositions();
    let spoiled = 0n;
    const tally = {
      [positionA]: 0n,
      [positionB]: 0n,
    };

    allBallots.entries().forEach(([_, { ballot, weight }]) => {
      const choice = ballot.chosen[0];
      if (!template.getPositions().includes(choice)) {
        spoiled += weight;
      } else {
        tally[choice] += weight;
      }
    });
    if (!quorum) {
      outcomePromise.reject('No quorum');
    }

    if (tally[positionA] > tally[positionB]) {
      outcomePromise.resolve(positionA);
    } else if (tally[positionB] > tally[positionA]) {
      outcomePromise.resolve(positionB);
    } else {
      outcomePromise.resolve("It's a tie!");
    }

    const stats = {
      spoiled,
      votes: allBallots.entries().length,
      results: [
        { position: positionA, total: tally[positionA] },
        { position: positionB, total: tally[positionB] },
      ],
    };
    tallyPromise.resolve(stats);
  };

  const adminFacet = Far('adminFacet', {
    closeVoting: () => (isOpen = false),
    countVotes,
    submitVote: recordBallot,
  });

  const publicFacet = Far('publicFacet', {
    getBallotTemplate: () => template,
    isOpen: () => isOpen,
    getOutcome: () => outcomePromise.promise,
    getStats: () => tallyPromise.promise,
  });
  return { publicFacet, adminFacet };
};
harden(makeBinaryBallotCounter);

export { makeBinaryBallotCounter };
