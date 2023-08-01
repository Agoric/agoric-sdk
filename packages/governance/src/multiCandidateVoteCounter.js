import { keyEQ, makeExo, makeScalarMapStore } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import {
  prepareDurableQuestionKit,
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
import { breakTie } from './breakTie.js';

const { Fail } = assert;

const validateQuestionSpec = questionSpec => {
  coerceQuestionSpec(questionSpec);

  questionSpec.electionType === ElectionType.ELECTION ||
    questionSpec.electionType === ElectionType.SURVEY ||
    Fail`${questionSpec.electionType} must be ELECTION or SURVEY`;

  questionSpec.method === ChoiceMethod.PLURALITY ||
    Fail`${questionSpec.method} must be PLURALITY`;
};

/** @type {BuildMultiVoteCounter} */
const makeMultiCandidateVoteCounter = (
  question,
  threshold,
  instance,
  publisher,
) => {
  const details = question.getDetails();

  let isOpen = true;
  const positions = details.positions;
  const maxChoices = details.maxChoices;

  /** @type { PromiseRecord<Position[]> } */
  const outcomePromise = makePromiseKit();
  /** @type { PromiseRecord<VoteStatistics> } */
  const tallyPromise = makePromiseKit();

  /**
   * @typedef {object} RecordedBallot
   * @property {Position[]} chosen
   * @property {bigint} shares
   */
  /** @type {MapStore<Handle<'Voter'>,RecordedBallot> } */
  const allBallots = makeScalarMapStore('voterHandle');

  const countVotes = () => {
    !isOpen || Fail`can't count votes while the election is open`;

    let spoiled = 0n;
    const tally = Array(positions.length).fill(0n);

    for (const { chosen, shares } of allBallots.values()) {
      for (const position of chosen) {
        const positionIndex = positions.findIndex(p => keyEQ(p, position));
        if (positionIndex < 0) {
          spoiled += shares;
        } else {
          tally[positionIndex] += shares;
        }
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
      /** @type {MultiOutcomeRecord} */
      const voteOutcome = {
        question: details.questionHandle,
        outcome: 'fail',
        reason: 'No quorum',
      };
      E(publisher).publish(voteOutcome);
      return;
    }

    const sortedPositions = stats.results.sort((a, b) =>
      Number(b.total - a.total),
    );

    let winningPositions = [];
    for (const position of sortedPositions) {
      if (position.total > 0n) {
        if (winningPositions.length < details.maxWinners) {
          winningPositions.push(position);
        } else if (
          winningPositions[winningPositions.length - 1].total === position.total
        ) {
          winningPositions.push(position);
        }
      }
    }

    const tieIndex = winningPositions.findIndex(
      position =>
        position.total === winningPositions[winningPositions.length - 1].total,
    );

    winningPositions = winningPositions.map(p => p.position);

    if (winningPositions.length === 0) {
      outcomePromise.resolve([details.tieOutcome]);
    } else if (winningPositions.length <= details.maxWinners) {
      outcomePromise.resolve(winningPositions);
    } else {
      const untiedPositions = winningPositions.slice(0, tieIndex);
      const tiedPositions = winningPositions.slice(tieIndex);
      const tieWinners = breakTie(
        tiedPositions,
        details.maxWinners - untiedPositions.length,
      );

      outcomePromise.resolve(untiedPositions.concat(tieWinners));
    }

    E.when(outcomePromise.promise, winPositions => {
      /** @type { MultiOutcomeRecord } */
      const voteOutcome = {
        question: details.questionHandle,
        positions: winPositions,
        outcome: 'win',
      };
      return E(publisher).publish(voteOutcome);
    });
  };

  const closeFacet = makeExo(
    'MultiCandidateVoteCounter close',
    VoteCounterCloseI,
    {
      closeVoting() {
        isOpen = false;
        countVotes();
      },
    },
  );

  const creatorFacet = makeExo(
    'MultiCandidateVoteCounter creator',
    VoteCounterAdminI,
    {
      submitVote(voterHandle, chosenPositions, shares = 1n) {
        chosenPositions.length <= maxChoices ||
          Fail`The number of choices exceeds the max choices.`;

        for (const position of chosenPositions) {
          positionIncluded(positions, position) ||
            Fail`The specified choice is not a legal position: ${position}.`;
        }

        const completedBallot = harden({ chosen: chosenPositions, shares });

        allBallots.has(voterHandle)
          ? allBallots.set(voterHandle, completedBallot)
          : allBallots.init(voterHandle, completedBallot);
        return completedBallot;
      },
    },
  );

  const publicFacet = makeExo(
    'MultiCandidateVoteCounter public',
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

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {ZCF<{questionSpec: QuestionSpec, quorumThreshold: bigint }>} zcf
 * @param {{outcomePublisher: Publisher<MultiOutcomeRecord>}} outcomePublisher
 * @param {Baggage} baggage
 */
const start = (zcf, { outcomePublisher }, baggage) => {
  const { questionSpec, quorumThreshold } = zcf.getTerms();
  const makeDurableQuestionKit = prepareDurableQuestionKit(baggage);
  validateQuestionSpec(questionSpec);
  const question = makeDurableQuestionKit(questionSpec, zcf.getInstance());

  const { publicFacet, creatorFacet, closeFacet } =
    makeMultiCandidateVoteCounter(
      question,
      quorumThreshold,
      zcf.getInstance(),
      outcomePublisher,
    );

  scheduleClose(questionSpec.closingRule, () => closeFacet.closeVoting());

  return { publicFacet, creatorFacet };
};

harden(start);
harden(makeMultiCandidateVoteCounter);

export { makeMultiCandidateVoteCounter, start };
