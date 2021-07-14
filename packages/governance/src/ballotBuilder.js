// @ts-check

import { assert, details as X } from '@agoric/assert';
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

const makeBallotSpec = (
  method,
  question,
  positions,
  electionType,
  maxChoices = 0,
) => {
  assert(maxChoices <= positions.length, X`Choices must not exceed length`);
  assert(
    positions.every(p => typeof p === 'string', X`positions must be strings`),
  );

  return { method, question, positions, maxChoices, electionType };
};

const buildEqualWeightBallot = (ballotSpec, instance, closingRule) => {
  const handle = makeHandle('Ballot');
  const { question, positions, maxChoices } = ballotSpec;
  const choose = chosenPositions => {
    assert(
      chosenPositions.length <= maxChoices,
      X`only ${maxChoices} position(s) allowed`,
    );
    assert(
      chosenPositions.every(p => positions.includes(p)),
      X`Some positions in ${chosenPositions} are not valid in ${positions}`,
    );

    /** @type {CompleteEqualWeightBallot} */
    return { handle, chosen: chosenPositions, question };
  };

  const getDetails = () =>
    harden({
      handle,
      ballotSpec,
      instance,
      closingRule,
    });

  return {
    getBallotCounter: () => instance,
    getDetails,
    choose,
  };
};

function verifyQuestionFormat(electionType, question) {
  switch (electionType) {
    case ElectionType.SURVEY:
    case ElectionType.ELECTION:
      assert.typeof(question, 'string');
      break;
    case ElectionType.PARAM_CHANGE:
      assert.typeof(question.param, 'string');
      assert(question.proposedValue);
      assertType(ParamType.INSTANCE, question.contract, electionType);
      break;
    default:
      throw Error(`Election type unrecognized`);
  }
}

/** @type {BuildBallot} */
const buildBallot = (ballotSpec, instance, closingRule) => {
  const { method } = ballotSpec;

  verifyQuestionFormat(ballotSpec.electionType, ballotSpec.question);

  switch (method) {
    case ChoiceMethod.CHOOSE_N:
      return buildEqualWeightBallot(ballotSpec, instance, closingRule);
    case ChoiceMethod.ORDER:
    case ChoiceMethod.WEIGHT:
      throw Error(`choice method ${method} is unimplemented`);
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

export {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  buildBallot,
  makeBallotSpec,
  verifyQuestionFormat,
};
