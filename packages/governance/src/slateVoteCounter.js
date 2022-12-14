import { makePromiseKit } from '@endo/promise-kit';
import { makeHeapFarInstance, keyEQ, makeStore } from '@agoric/store';
import { E } from '@endo/eventual-send';

import {
  buildQuestion,
  ChoiceMethod,
  coerceQuestionSpec,
  positionIncluded,
} from './question.js';
import { scheduleClose } from './closingRule.js';
import {
  VoteCounterAdminI,
  VoteCounterCloseI,
  VoteCounterPublicI,
} from './typeGuards.js';
import { makeQuorumCounter } from './quorumCounter.js';
import { q } from '@agoric/assert';

const { details: X } = assert;

const validateSlateQuestionSpec = questionSpec => {
  coerceQuestionSpec(questionSpec);

  questionSpec.maxChoices === 1 ||
    assert.fail(X`Can only choose 1 item on a question`);
  questionSpec.winOutcome ||
    assert.fail(X`Must specify win outcome on question`);
  questionSpec.method === ChoiceMethod.UNRANKED ||
    assert.fail(X`${questionSpec.method} must be UNRANKED`);
  questionSpec.positions[0].text === 'yes' ||
    assert.fail(X`First position must be yes`);
  questionSpec.positions[1].text === 'no' ||
    assert.fail(X`Second position must be no`);
};

/** @type {BuildVoteCounter} */
const makeSlateVoteCounter = (questionSpec, threshold, instance, publisher) => {
  validateSlateQuestionSpec(questionSpec);

  const question = buildQuestion(questionSpec, instance);
  const details = question.getDetails();

  let isOpen = true;
  const positions = questionSpec.positions;

  /** @type { Position } */
  const winOutcome = details.winOutcome;
  /** @type { PromiseRecord<Position> } */
  const outcomePromise = makePromiseKit();
  /** @type { PromiseRecord<VoteStatistics> } */
  const tallyPromise = makePromiseKit();

  /**
   * @typedef {object} RecordedBallot
   * @property {Position[]} chosen
   * @property {bigint} shares
   */
  /** @type {Store<Handle<'Voter'>,RecordedBallot> } */
  const allBallots = makeStore('voterHandle');

  const countVotes = () => {
    assert(!isOpen, X`can't count votes while the election is open`);

    let spoiled = 0n;
    const tally = [0n, 0n];

    for (const { chosen } of allBallots.values()) {
      const choice = positions.findIndex(p => keyEQ(p, chosen[0]));
      if (choice < 0) {
        spoiled += 1n;
      } else {
        tally[choice] += 1n;
      }
    }

    /** @type { VoteStatistics } */
    const stats = {
      spoiled,
      votes: allBallots.getSize(),
      results: [
        { position: positions[0], total: tally[0] },
        { position: positions[1], total: tally[1] },
      ],
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

    if (tally[0] > tally[1]) {
      outcomePromise.resolve(winOutcome);
    } else {
      outcomePromise.reject('Rejected');
      /** @type {OutcomeRecord} */
      const voteOutcome = {
        question: details.questionHandle,
        outcome: 'fail',
        reason: 'Rejected',
      };
      E(publisher).publish(voteOutcome);
      return;
    }

    E.when(outcomePromise.promise, position => {
      /** @type {OutcomeRecord} */
      const voteOutcome = {
        question: details.questionHandle,
        position,
        outcome: 'win',
      };
      return E(publisher).publish(voteOutcome);
    });
  };

  const closeFacet = makeHeapFarInstance(
    'SlateVoteCounter close',
    VoteCounterCloseI,
    {
      closeVoting() {
        isOpen = false;
        countVotes();
      },
    },
  );

  const creatorFacet = makeHeapFarInstance(
    'SlateVoteCounter creator',
    VoteCounterAdminI,
    {
      submitVote(voterHandle, chosen, shares = 1n) {
        assert(chosen.length === 1, 'only 1 position allowed');
        const [position] = chosen;
        positionIncluded(positions, position) ||
          assert.fail(
            X`The specified choice is not a legal position: ${position}.`,
          );

        const completedBallot = harden({ chosen: [position], shares });
        allBallots.has(voterHandle)
          ? allBallots.set(voterHandle, completedBallot)
          : allBallots.init(voterHandle, completedBallot);
        return completedBallot;
      },
    },
  );

  const publicFacet = makeHeapFarInstance(
    'SlateVoteCounter public',
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
 * @param {ZCF<{questionSpec: QuestionSpec, quorumThreshold: bigint}>} zcf
 * @param {{outcomePublisher: Publisher<OutcomeRecord>}} outcomePublisher
 */
const start = (zcf, { outcomePublisher }) => {
  const { questionSpec, quorumThreshold } = zcf.getTerms();

  const { publicFacet, creatorFacet, closeFacet } = makeSlateVoteCounter(
    questionSpec,
    quorumThreshold,
    zcf.getInstance(),
    outcomePublisher,
  );

  scheduleClose(questionSpec.closingRule, () => closeFacet.closeVoting());

  return { publicFacet, creatorFacet };
};

harden(makeSlateVoteCounter);
export { makeSlateVoteCounter, start };
