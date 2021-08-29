// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { Far, passStyleOf } from '@agoric/marshal';
import { sameStructure } from '@agoric/same-structure';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { Nat } from '@agoric/nat';

import { looksLikeParam } from './paramManager.js';

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
 *   MAJORITY: 'majority',
 *   NO_QUORUM: 'no_quorum',
 *   ALL: 'all',
 * }}
 */
const QuorumRule = {
  MAJORITY: 'majority',
  NO_QUORUM: 'no_quorum',
  // The election isn't valid unless all voters cast a ballot
  ALL: 'all',
};

/** @param {SimpleQuestion} question */
const looksLikeSimpleQuestion = question => {
  assert.typeof(
    question.text,
    'string',
    X`Question ("${question}") must be a record with text: aString`,
  );
};

/** @param {ParamChangeQuestion} question */
const looksLikeParamChangeQuestion = question => {
  assert.typeof(
    question.paramSpec,
    'object',
    X`Question ("${question}") must be a record with paramSpec: anObject`,
  );
  assert(question.proposedValue);
  looksLikeParam(question.contract, 'contract');
};

/** @type {LooksLikeQuestionForType} */
const looksLikeQuestionForType = (electionType, question) => {
  assert(
    passStyleOf(question) === 'copyRecord',
    X`A question can only be a pass-by-copy record: ${question}`,
  );

  switch (electionType) {
    case ElectionType.SURVEY:
    case ElectionType.ELECTION:
      looksLikeSimpleQuestion(/** @type {SimpleQuestion} */ (question));
      break;
    case ElectionType.PARAM_CHANGE:
      looksLikeParamChangeQuestion(
        /** @type {ParamChangeQuestion} */ (question),
      );
      break;
    default:
      throw Error(`Election type unrecognized`);
  }
};

/** @type {PositionIncluded} */
const positionIncluded = (positions, p) =>
  positions.some(e => sameStructure(e, p));

// BallotSpec contains the subset of BallotDetails that can be specified before
function looksLikeClosingRule(closingRule) {
  const { timer, deadline } = closingRule;
  Nat(deadline);
  assert(passStyleOf(timer) === 'remotable', X`Timer must be a timer ${timer}`);
}

const assertEnumIncludes = (enumeration, value, name) => {
  assert(
    Object.getOwnPropertyNames(enumeration)
      .map(k => enumeration[k])
      .includes(value),
    X`Illegal ${name}: ${value}`,
  );
};

// the ballot is created.
/** @type {LooksLikeBallotSpec} */
const looksLikeBallotSpec = ({
  method,
  question,
  positions,
  electionType,
  maxChoices,
  closingRule,
  quorumRule,
  tieOutcome,
}) => {
  looksLikeQuestionForType(electionType, question);

  assert(
    positions.every(
      p => passStyleOf(p) === 'copyRecord',
      X`positions must be records`,
    ),
  );
  assert(
    positionIncluded(positions, tieOutcome),
    X`tieOutcome must be a legal position: ${q(tieOutcome)}`,
  );
  assertEnumIncludes(QuorumRule, quorumRule, 'QuorumRule');
  assertEnumIncludes(ElectionType, electionType, 'ElectionType');
  assertEnumIncludes(ChoiceMethod, method, 'ChoiceMethod');
  assert(maxChoices > 0, X`maxChoices must be positive: ${maxChoices}`);

  looksLikeClosingRule(closingRule);

  return harden({
    method,
    question,
    positions,
    maxChoices: Number(maxChoices),
    electionType,
    closingRule,
    quorumRule,
    tieOutcome,
  });
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
  looksLikeQuestionForType(ballotSpec.electionType, ballotSpec.question);

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
harden(looksLikeQuestionForType);
harden(positionIncluded);

export {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  buildBallot,
  looksLikeBallotSpec,
  positionIncluded,
  looksLikeQuestionForType,
};
