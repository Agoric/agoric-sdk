// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far, passStyleOf } from '@agoric/marshal';
import { sameStructure } from '@agoric/same-structure';
import { makeHandle } from '@agoric/zoe/src/makeHandle';

import { assertType, ParamType } from './paramManager';

/**
 * @type {{
 *   CHOOSE_N: 'choose_n',
 *   ORDER: 'order',
 *   WEIGHT: 'weight',
 * }}
 */
const ChoiceMethod = {
  CHOOSE_N: 'choose_n',
  ORDER: 'order',
  WEIGHT: 'weight',
};

/** @type {{
 *   PARAM_CHANGE: 'param_change',
 *   ELECTION: 'election',
 *   SURVEY: 'survey',
 * }}
 */
const ElectionType = {
  // A parameter is named, and a new value proposed
  PARAM_CHANGE: 'param_change',
  // choose one or multiple winners, depending on ChoiceMethod
  ELECTION: 'election',
  SURVEY: 'survey',
};

/** @type {{
 *   HALF: 'half',
 *   NONE: 'none',
 *   ALL: 'all',
 * }}
 */
const QuorumRule = {
  HALF: 'half',
  NONE: 'none',
  ALL: 'all',
};

const verifyQuestionFormat = (electionType, question) => {
  switch (electionType) {
    case ElectionType.SURVEY:
    case ElectionType.ELECTION:
      assert.typeof(
        question.text,
        'string',
        X`Question ("${question}") must be a record with text: aString`,
      );
      break;
    case ElectionType.PARAM_CHANGE:
      assert.typeof(
        question.paramSpec,
        'object',
        X`Question ("${question}") must be a record with paramSpec: anObject`,
      );
      assert(question.proposedValue);
      assertType(ParamType.INSTANCE, question.contract, electionType);
      break;
    default:
      throw Error(`Election type unrecognized`);
  }
};

const positionIncluded = (positions, p) =>
  positions.some(e => sameStructure(e, p));

// BallotSpec contains the subset of BallotDetails that can be specified before
// the ballot is created.
const makeBallotSpec = (
  method,
  question,
  positions,
  electionType,
  maxChoices,
  closingRule,
  quorumRule,
  tieOutcome,
) => {
  verifyQuestionFormat(electionType, question);

  assert(
    positions.every(
      p => passStyleOf(p) === 'copyRecord',
      X`positions must be records`,
    ),
  );

  assert(
    [QuorumRule.HALF, QuorumRule.ALL, QuorumRule.NONE].includes(quorumRule),
    X`Illegal QuorumRule ${quorumRule}`,
  );

  return {
    method,
    question,
    positions,
    maxChoices,
    electionType,
    closingRule,
    quorumRule,
    tieOutcome,
  };
};

const buildEqualWeightBallot = (ballotSpec, counterInstance) => {
  const handle = makeHandle('Ballot');
  const choose = chosenPositions => {
    assert(
      chosenPositions.length <= ballotSpec.maxChoices,
      X`only ${ballotSpec.maxChoices} position(s) allowed`,
    );

    assert(
      chosenPositions.every(p => positionIncluded(ballotSpec.positions, p)),
      X`Some positions in ${chosenPositions} are not valid in ${ballotSpec.positions}`,
    );

    /** @type {CompleteEqualWeightBallot} */
    return { handle, chosen: chosenPositions, question: ballotSpec.question };
  };

  const getDetails = () =>
    harden({
      ...ballotSpec,
      handle,
      counterInstance,
    });

  return Far('ballot details', {
    getBallotCounter: () => counterInstance,
    getDetails,
    choose,
  });
};

/** @type {BuildBallot} */
const buildBallot = (ballotSpec, counterInstance) => {
  verifyQuestionFormat(ballotSpec.electionType, ballotSpec.question);

  switch (ballotSpec.method) {
    case ChoiceMethod.CHOOSE_N:
      return buildEqualWeightBallot(ballotSpec, counterInstance);
    case ChoiceMethod.ORDER:
    case ChoiceMethod.WEIGHT:
      throw Error(`choice method ${ballotSpec.method} is unimplemented`);
    default:
      throw Error(`choice method unrecognized`);
  }
};

harden(buildBallot);
harden(ChoiceMethod);
harden(QuorumRule);
harden(ElectionType);
harden(makeBallotSpec);
harden(verifyQuestionFormat);
harden(positionIncluded);

export {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  buildBallot,
  makeBallotSpec,
  positionIncluded,
  verifyQuestionFormat,
};
