// @ts-check

import { assert, details as X } from '@agoric/assert';

// CHOOSE_N: voter indicates up to N they find acceptable (N might be 1).
// ORDER: voter lists their choices from most to least favorite.
// WEIGHT: voter lists their choices, each with a numerical weight. High
//   numbers are most preferred.

const ChoiceMethod = {
  CHOOSE_N: 'choose_n',
  ORDER: 'order',
  WEIGHT: 'weight',
};

const buildBallot = (method, question, positions, maxChoices = 0) => {
  const choose = (...chosenPositions) => {
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
    return { question, chosen: chosenPositions };
  };

  return {
    getMethod: () => method,
    getQuestion: () => question,
    getPositions: () => positions,
    getMaxChoices: () => maxChoices,
    choose,
  };
};

harden(buildBallot);

export { ChoiceMethod, buildBallot };
