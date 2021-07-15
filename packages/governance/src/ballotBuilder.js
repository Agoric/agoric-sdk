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
  instance,
) => {
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
      method,
      question,
      positions,
      maxChoices,
      instance,
    });

  return {
    getBallotCounter: () => instance,
    getDetails,
    choose,
  };
};

/** @type {BuildBallot} */
const buildBallot = (method, question, positions, maxChoices = 0, instance) => {
  assert.typeof(question, 'string');

  switch (method) {
    case ChoiceMethod.CHOOSE_N:
      return buildEqualWeightBallot(
        method,
        question,
        positions,
        maxChoices,
        instance,
      );
    case ChoiceMethod.ORDER:
    case ChoiceMethod.WEIGHT:
      throw Error(`choice method ${ChoiceMethod.WEIGHT} is unimplemented`);
    default:
      throw Error(`choice method unrecognized`);
  }
};

harden(buildBallot);

export { ChoiceMethod, buildBallot };
