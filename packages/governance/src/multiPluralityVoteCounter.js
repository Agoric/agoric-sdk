// @ts-check

import { keyEQ, makeHeapFarInstance, makeStore } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import {
  buildQuestion,
  ChoiceMethod,
  coerceQuestionSpec,
  ElectionType,
  positionIncluded,
} from './question.js';
import { scheduleClose } from './closingRule.js';
import {
  VoteCounterAdminI,
  VoteCounterCloseI,
  VoteCounterPublicI,
} from './typeGuards.js';
import { makeQuorumCounter } from './quorumCounter.js';

const { details: X } = assert;

const validateQuestionSpec = questionSpec => {
  coerceQuestionSpec(questionSpec);

  questionSpec.electionType === ElectionType.ELECTION ||
    questionSpec.electionType === ElectionType.SURVEY ||
    assert.fail(X`${questionSpec.electionType} must be ELECTION or SURVEY`);

  questionSpec.maxChoices === 1 ||
    assert.fail(X`Can only choose 1 item on a multiple question`);

  questionSpec.method === ChoiceMethod.PLURALITY ||
    assert.fail(X`${questionSpec.method} must be PLURALITY`);

  questionSpec.maxWinners > 2 ||
    assert.fail(X`Max winners must be more than 2`);
};

/** @type {BuildVoteCounter} */
const makeMultiPluralityVoteCounter = (
  questionSpec,
  threshold,
  instance,
  publisher,
) => {
  validateQuestionSpec(questionSpec);

  const question = buildQuestion(questionSpec, instance);
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
  /** @type {Store<Handle<'Voter'>,RecordedBallot> } */
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
    }

    const tallyPositions = tally.map((t, i) => ({
      position: positions[i],
      tally: t,
    }));

    const sortedPositions = tallyPositions.sort((a, b) => {
      if (a.tally < b.tally) return 1;
      if (a.tally > b.tally) return -1;
      return 0;
    });

    const uniqTally = [];
    for (const position of sortedPositions) {
      if (!uniqTally.includes(position.tally)) {
        uniqTally.push(position.tally);
      }
    }

    const winningTally = uniqTally.slice(0, questionSpec.maxWinners);
    const winningPositions = [];

    for (const position of sortedPositions) {
      if (winningTally.includes(position.tally)) {
        winningPositions.push(position.position);
      }
    }

    if (winningPositions.length <= questionSpec.maxWinners) {
      outcomePromise.resolve(winningPositions);
    } else {
      outcomePromise.resolve(questionSpec.tieOutcome);
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
    'MultiPluralityVoteCounter close',
    VoteCounterCloseI,
    {
      closeVoting() {
        isOpen = false;
        countVotes();
      },
    },
  );

  const creatorFacet = makeHeapFarInstance(
    'MultiPluralityVoteCounter creator',
    VoteCounterAdminI,
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
    'MultiPluralityVoteCounter public',
    VoteCounterPublicI,
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

  const { publicFacet, creatorFacet, closeFacet } =
    makeMultiPluralityVoteCounter(
      questionSpec,
      quorumThreshold,
      zcf.getInstance(),
      outcomePublisher,
    );

  scheduleClose(questionSpec.closingRule, () => closeFacet.closeVoting());

  return { publicFacet, creatorFacet };
};

harden(start);
harden(makeMultiPluralityVoteCounter);

export { makeMultiPluralityVoteCounter, start };
