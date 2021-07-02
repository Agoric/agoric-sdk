// @ts-check

import { assert, details as X } from '@agoric/assert';

// CHOOSE_N: voter indicates up to N they find acceptable (N might be 1).
// ORDER: voter lists their choices from most to least favorite.
// WEIGHT: voter lists their choices, each with a numerical weight. High
//   numbers are most preferred.

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

const makeBallotSpec = (method, question, positions, maxChoices = 0) => {
  assert.typeof(question, 'string');
  assert(maxChoices <= positions.length, X`Choices must not exceed length`);
  assert(
    positions.every(p => typeof p === 'string', X`positions must be strings`),
  );

  return { method, question, positions, maxChoices };
};

const buildEqualWeightBallot = (ballotSpec, instance, closingRule) => {
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
    return { question, chosen: chosenPositions };
  };

  const getDetails = () =>
    harden({
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

/** @type {BuildBallot} */
const buildBallot = (ballotSpec, instance, closingRule) => {
  const { question, method } = ballotSpec;
  assert.typeof(question, 'string');

  switch (method) {
    case ChoiceMethod.CHOOSE_N:
      return buildEqualWeightBallot(ballotSpec, instance, closingRule);
    case ChoiceMethod.ORDER:
    case ChoiceMethod.WEIGHT:
      throw Error(`choice method ${ChoiceMethod.WEIGHT} is unimplemented`);
    default:
      throw Error(`choice method unrecognized`);
  }
};

harden(buildBallot);

export { ChoiceMethod, buildBallot, makeBallotSpec };
