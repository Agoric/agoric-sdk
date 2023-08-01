import { mustMatch, keyEQ, M } from '@agoric/store';
import { defineDurableHandle } from '@agoric/zoe/src/makeHandle.js';
import { prepareExoClass } from '@agoric/vat-data';
import { InstanceHandleShape } from '@agoric/zoe/src/typeGuards.js';

import { QuestionI, QuestionSpecShape } from './typeGuards.js';

// Topics being voted on are 'Questions'. Before a Question is known to a
// electorate, the parameters can be described with a QuestionSpec. Once the
// question has been presented to an Electorate, there is a QuestionDetails
// record that also includes the VoteCounter which will determine the outcome
// and the questionHandle that uniquely identifies it.

/**
 * "unranked" is more formally known as "approval" voting, but this is hard for
 * people to intuit when there are only two alternatives.
 */
export const ChoiceMethod = /** @type {const} */ ({
  UNRANKED: 'unranked',
  ORDER: 'order',
  PLURALITY: 'plurality',
});
harden(ChoiceMethod);

export const ElectionType = /** @type {const} */ ({
  // A parameter is named, and a new value proposed
  PARAM_CHANGE: 'param_change',
  // choose one or multiple winners, depending on ChoiceMethod
  ELECTION: 'election',
  SURVEY: 'survey',
  // whether or not to invoke an API method
  API_INVOCATION: 'api_invocation',
  OFFER_FILTER: 'offer_filter',
});
harden(ElectionType);

export const QuorumRule = /** @type {const} */ ({
  MAJORITY: 'majority',
  NO_QUORUM: 'no_quorum',
  // The election isn't valid unless all voters vote
  ALL: 'all',
});
harden(QuorumRule);

/** @type {PositionIncluded} */
export const positionIncluded = (positions, p) =>
  positions.some(e => keyEQ(e, p));
harden(positionIncluded);

/**
 * @param {QuestionSpec} allegedQuestionSpec
 * @returns {QuestionSpec}
 */
export const coerceQuestionSpec = ({
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
harden(coerceQuestionSpec);

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {Baggage} baggage
 * @returns {BuildQuestion}
 */
export const prepareDurableQuestionKit = baggage => {
  const makeDurableHandle = defineDurableHandle(baggage, 'question');
  return prepareExoClass(
    baggage,
    'question details',
    QuestionI,
    (questionSpec, counterInstance) => ({
      questionSpec,
      counterInstance,
      questionHandle: makeDurableHandle(),
    }),
    {
      getVoteCounter() {
        return this.state.counterInstance;
      },
      getDetails() {
        const { state } = this;

        return harden({
          ...state.questionSpec,
          questionHandle: state.questionHandle,
          counterInstance: state.counterInstance,
        });
      },
    },
    {
      stateShape: harden({
        questionSpec: QuestionSpecShape,
        counterInstance: InstanceHandleShape,
        questionHandle: M.remotable('Question'),
      }),
    },
  );
};
harden(prepareDurableQuestionKit);
