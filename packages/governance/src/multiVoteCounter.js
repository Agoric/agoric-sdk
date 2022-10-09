// @ts-check

import { keyEQ, makeHeapFarInstance, makeStore } from '@agoric/store';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { scheduleClose } from './closingRule.js';
import {
  ChoiceMethod,
  coerceQuestionSpec,
  ElectionType,
  positionIncluded,
} from './question.js';
import {
  MultiVoteCounterAdminI,
  MultiVoteCounterCloseI,
  MultiVoteCounterPublicI,
  QuestionI,
} from './typeGuards.js';

const { details: X } = assert;

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

const validateMultipleQuestionSpec = questionSpec => {
  coerceQuestionSpec(questionSpec);

  questionSpec.electionType === ElectionType.ELECTION ||
    questionSpec.electionType === ElectionType.SURVEY ||
    assert.fail(X`${questionSpec.electionType} must be ELECTION or SURVEY`);

  questionSpec.maxChoices === 1 ||
    assert.fail(X`Can only choose 1 item on a multiple question`);

  questionSpec.method === ChoiceMethod.PLURALITY ||
    assert.fail(X`${questionSpec.method} must be PLURALITY`);
};

/** @type {BuildVoteCounter} */
const makeMultiVoteCounter = (questionSpec, threshold, instance, publisher) => {
  validateMultipleQuestionSpec(questionSpec);

  // build question
  const questionHandle = makeHandle('Question');
  const question = makeHeapFarInstance('question details', QuestionI, {
    getVoteCounter() {
      return instance;
    },
    getDetails() {
      return harden({
        ...questionSpec,
        questionHandle,
        counterInstance: instance,
      });
    },
  });
  const details = question.getDetails();

  let isOpen = true;
  const positions = questionSpec.positions;
  /** @type { PromiseRecord<Position | Position[]> } */
  const outcomePromise = makePromiseKit();
  /** @type { PromiseRecord<VoteStatistics> } */
  const tallyPromise = makePromiseKit();

  /**
   * @typedef {object} RecordedBallot
   * @property {Position} chosen
   * @property {bigint} shares
   */
  /** @type {Store<Handle<'Voter'>,RecordedBallot>} */
  const allBallots = makeStore('voterHandle');

  const countVotes = () => {
    assert(!isOpen, X`can't count votes while the election is open`);

    let spoiled = 0n;
    const tally = Array(positions.length).fill(0n);

    for (const { chosen, shares } of allBallots.values()) {
      const positionIndex = positions.findIndex(p => keyEQ(p, chosen));
      if (positionIndex < 0) {
        spoiled += shares;
      } else {
        tally[positionIndex] += shares;
      }
    }

    /** @type { VoteStatistics } */
    const stats = {
      spoiled,
      votes: allBallots.getSize(),
      results: tally.map((_, i) => ({
        position: positions[i],
        total: tally[i],
      })),
    };

    tallyPromise.resolve(stats);

    if (!makeQuorumCounter(threshold).check(stats)) {
      outcomePromise.reject('No quorum');
      /** @type {OutcomeRecord} */
      const voteOutcome = {
        question: details.questionHandle,
        outcome: 'fail',
        reason: 'No quorum',
      };
      E(publisher).publish(voteOutcome);
      return;
    }

    let maxScore = 0n;
    for (const score of tally) {
      if (score > maxScore) maxScore = score;
    }

    const winningPositions = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < tally.length; i++) {
      if (tally[i] === maxScore) {
        winningPositions.push(positions[i]);
      }
    }

    if (winningPositions.length > 1) {
      outcomePromise.resolve(winningPositions);
    } else {
      outcomePromise.resolve(winningPositions[0]);
    }

    E.when(outcomePromise.promise, position => {
      /** @type { OutcomeRecord } */
      const voteOutcome = {
        question: details.questionHandle,
        position,
        outcome: 'win',
      };
      return E(publisher).publish(voteOutcome);
    });
  };

  const closeFacet = makeHeapFarInstance(
    'MultiVoteCounter close',
    MultiVoteCounterCloseI,
    {
      closeVoting() {
        isOpen = false;
        countVotes();
      },
    },
  );

  const creatorFacet = makeHeapFarInstance(
    'MultiVoteCounter creator',
    MultiVoteCounterAdminI,
    {
      submitVote(voterHandle, chosenPositions, shares = 1n) {
        assert(chosenPositions.length === 1, 'only 1 position allowed');
        const [position] = chosenPositions;
        positionIncluded(positions, position) ||
          assert.fail(
            X`The specified choice is not a legal position: ${position}`,
          );

        const completedBallot = harden({ chosen: position, shares });
        allBallots.has(voterHandle)
          ? allBallots.set(voterHandle, completedBallot)
          : allBallots.init(voterHandle, completedBallot);
        return completedBallot;
      },
    },
  );

  const publicFacet = makeHeapFarInstance(
    'MultiVoteCounter public',
    MultiVoteCounterPublicI,
    {
      getQuestion() {
        return question;
      },
      isOpen() {
        return isOpen;
      },
      getOutcome() {
        return outcomePromise.promise;
      },
      getStats() {
        return tallyPromise.promise;
      },
      getDetails() {
        return details;
      },
      getInstance() {
        return instance;
      },
    },
  );

  return harden({
    creatorFacet,
    publicFacet,
    closeFacet,
  });
};

/**
 *
 * @param {ZCF<{questionSpec: QuestionSpec, quorumThreshold: bigint }>} zcf
 * @param {{outcomePublisher: Publisher<OutcomeRecord>}} outcomePublisher
 */
const start = (zcf, { outcomePublisher }) => {
  const { questionSpec, quorumThreshold } = zcf.getTerms();

  const { publicFacet, creatorFacet, closeFacet } = makeMultiVoteCounter(
    questionSpec,
    quorumThreshold,
    zcf.getInstance(),
    outcomePublisher,
  );

  scheduleClose(questionSpec.closingRule, () => closeFacet.closeVoting());

  return { publicFacet, creatorFacet };
};

harden(start);
harden(makeMultiVoteCounter);

export { makeMultiVoteCounter, start };
