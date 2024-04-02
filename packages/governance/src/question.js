import { makeExo, mustMatch, keyEQ, M } from '@agoric/store';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';

import { QuestionI, QuestionSpecShape } from './typeGuards.js';

/**
 * @import {BuildQuestion, PositionIncluded, Question, QuestionSpec} from './types.js';
 */

// Topics being voted on are 'Questions'. Before a Question is known to a
// electorate, the parameters can be described with a QuestionSpec. Once the
// question has been presented to an Electorate, there is a QuestionDetails
// record that also includes the VoteCounter which will determine the outcome
// and the questionHandle that uniquely identifies it.

/**
 * "unranked" is more formally known as "approval" voting, but this is hard for
 * people to intuit when there are only two alternatives.
 */
const ChoiceMethod = /** @type {const} */ ({
  UNRANKED: 'unranked',
  ORDER: 'order',
  PLURALITY: 'plurality',
});

const ElectionType = /** @type {const} */ ({
  // A parameter is named, and a new value proposed
  PARAM_CHANGE: 'param_change',
  // choose one or multiple winners, depending on ChoiceMethod
  ELECTION: 'election',
  SURVEY: 'survey',
  // whether or not to invoke an API method
  API_INVOCATION: 'api_invocation',
  OFFER_FILTER: 'offer_filter',
});

const QuorumRule = /** @type {const} */ ({
  MAJORITY: 'majority',
  NO_QUORUM: 'no_quorum',
  // The election isn't valid unless all voters vote
  ALL: 'all',
});

/** @type {PositionIncluded} */
const positionIncluded = (positions, p) => positions.some(e => keyEQ(e, p));

/**
 * @internal
 * @param {QuestionSpec} allegedQuestionSpec
 * @returns {QuestionSpec}
 */
const coerceQuestionSpec = ({
  method,
  issue,
  positions,
  electionType,
  maxChoices,
  maxWinners,
  closingRule,
  quorumRule,
  tieOutcome,
}) => {
  const question = harden({
    method,
    issue,
    positions,
    maxChoices: Number(maxChoices),
    maxWinners: Number(maxWinners),
    electionType,
    closingRule,
    quorumRule,
    tieOutcome,
  });

  mustMatch(question, QuestionSpecShape);

  // XXX It would be nice to enforce this using parameterized types, but that
  // seems to only enforce type constraints, (i.e. the tieOutcome will be the
  // same type as any of the positions) unless you can provide the concrete
  // value at pattern creation time.
  mustMatch(question.tieOutcome, M.or(...question.positions));

  return question;
};

/** @type {BuildQuestion} */
const buildQuestion = (questionSpec, counterInstance) => {
  const questionHandle = makeHandle('Question');

  /** @type {Question} */
  return makeExo('question details', QuestionI, {
    getVoteCounter() {
      return counterInstance;
    },
    getDetails() {
      return harden({
        ...questionSpec,
        questionHandle,
        counterInstance,
      });
    },
  });
};

harden(buildQuestion);
harden(ChoiceMethod);
harden(ElectionType);
harden(coerceQuestionSpec);
harden(positionIncluded);
harden(QuorumRule);

export {
  buildQuestion,
  ChoiceMethod,
  ElectionType,
  coerceQuestionSpec,
  positionIncluded,
  QuorumRule,
};
