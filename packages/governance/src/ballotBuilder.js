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

const buildEqualWeightBallot = (
  method,
  question,
  positions,
  maxChoices = 0,
) => {
  const choose = chosenPositions => {
    assert(
      chosenPositions.length <= maxChoices,
      X`only ${maxChoices} position(s) allowed`,
    );

    for (const position of chosenPositions) {
      assert(
        positions.includes(position),
        X`Not a valid position: ${position}`,
      );
    }
    /** @type {CompleteEqualWeightBallot} */
    return { question, chosen: chosenPositions };
  };

  const getDetails = () =>
    harden({
      method,
      question,
      positions,
      maxChoices,
    });

  return {
    getDetails,
    choose,
  };
};

/** @type {BuildBallot} */
const buildBallot = (method, question, positions, maxChoices = 0) => {
  assert.typeof(question, 'string');

  switch (method) {
    case ChoiceMethod.CHOOSE_N:
      return buildEqualWeightBallot(method, question, positions, maxChoices);
    case ChoiceMethod.ORDER:
      throw Error(`choice method ${ChoiceMethod.ORDER} is unimplemented`);
    case ChoiceMethod.WEIGHT:
      throw Error(`choice method ${ChoiceMethod.WEIGHT} is unimplemented`);
    default:
      throw Error(`choice method unrecognized`);
  }
};

harden(buildBallot);

export { ChoiceMethod, buildBallot };
