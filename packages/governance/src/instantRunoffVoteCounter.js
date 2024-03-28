import { makeHeapFarInstance, makeStore } from '@agoric/store';
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
import { countIRVVotes } from './irv.js';

const { Fail } = assert;

const validateQuestionSpec = questionSpec => {
  coerceQuestionSpec(questionSpec);

  questionSpec.electionType === ElectionType.ELECTION ||
    questionSpec.electionType === ElectionType.SURVEY ||
    Fail`${questionSpec.electionType} must be ELECTION or SURVEY`;

  questionSpec.method === ChoiceMethod.ORDER ||
    Fail`${questionSpec.method} must be ORDER`;
};

/** @type {BuildVoteCounter} */
const makeInstantRunoffVoteCounter = (
  questionSpec,
  threshold,
  instance,
  publisher,
) => {
  validateQuestionSpec(questionSpec);

  const question = buildQuestion(questionSpec, instance);
  const qDetails = question.getDetails();

  let isOpen = true;
  const { positions, winningThreshold, maxChoices } = questionSpec;

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
    !isOpen || Fail`can't count votes while the election is open`;

    const result = countIRVVotes(
      Array.from(allBallots.values()),
      positions,
      winningThreshold,
    );

    const positionRs = Object.values(result.stats).map(
      ({ position, total, details }) => ({
        position,
        total,
        details,
      }),
    );

    const stats = {
      // all votes should be validated while submitting
      spoiled: 0n,
      // total first choice shares of all position
      accepted: positionRs.reduce((acc, p) => acc + p.details[0], 0n),
      votes: allBallots.getSize(),
      results: positionRs,
    };

    tallyPromise.resolve(stats);

    if (stats.accepted < threshold) {
      outcomePromise.reject('No quorum');
      /** @type {OutcomeRecord} */
      const voteOutcome = {
        question: qDetails.questionHandle,
        outcome: 'fail',
        reason: 'No quorum',
      };
      E(publisher).publish(voteOutcome);
      return;
    }

    if (result.winner) {
      outcomePromise.resolve(result.winner);
    } else {
      outcomePromise.resolve(questionSpec.tieOutcome);
    }

    E.when(outcomePromise.promise, position => {
      /** @type { OutcomeRecord } */
      const voteOutcome = {
        question: qDetails.questionHandle,
        position,
        outcome: 'win',
      };
      return E(publisher).publish(voteOutcome);
    });
  };

  const closeFacet = makeHeapFarInstance(
    'InstantRunoffVoteCounter close',
    VoteCounterCloseI,
    {
      closeVoting() {
        isOpen = false;
        countVotes();
      },
    },
  );

  const creatorFacet = makeHeapFarInstance(
    'InstantRunoffVoteCounter creator',
    VoteCounterAdminI,
    {
      submitVote(voterHandle, chosenPositions, shares = 1n) {
        isOpen || Fail`The election is closed`;

        const chosenCount = chosenPositions.length;
        const uniqueCount = new Set(chosenPositions).size;

        chosenCount === uniqueCount || Fail`Duplicated position(s) found.`;

        chosenCount <= maxChoices ||
          Fail`The number of choices exceeds maxChoices: ${maxChoices}.`;

        chosenPositions.forEach(position => {
          positionIncluded(positions, position) ||
            Fail`The specified choice is not a legal position: ${position}.`;
        });

        const completedBallot = harden({ chosen: chosenPositions, shares });

        allBallots.has(voterHandle)
          ? allBallots.set(voterHandle, completedBallot)
          : allBallots.init(voterHandle, completedBallot);
        return completedBallot;
      },
    },
  );

  const publicFacet = makeHeapFarInstance(
    'InstantRunoffVoteCounter public',
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
        return qDetails;
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
    makeInstantRunoffVoteCounter(
      questionSpec,
      quorumThreshold,
      zcf.getInstance(),
      outcomePublisher,
    );

  scheduleClose(questionSpec.closingRule, () => closeFacet.closeVoting());

  return { publicFacet, creatorFacet };
};

harden(start);
harden(makeInstantRunoffVoteCounter);

export { makeInstantRunoffVoteCounter, start };
