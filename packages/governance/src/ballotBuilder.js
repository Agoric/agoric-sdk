// @ts-check

import { assert, details as X } from '@agoric/assert';

// CHOOSE_ONE: voter indicates only their favorite. ORDER: voter lists their
// choices from most to least favorite. RANK: voter lists their choices, each
// with a numerical ranking. Low numbers are most preferred.
const ChoiceMethod = {
  CHOOSE_ONE: 'choose_one',
  ORDER: 'order',
  RANK: 'rank',
};

function buildBallot(method, question, positions) {
  function choose(position) {
    assert(positions.includes(position), X`Not a valid position: ${position}`);
    return { question, chosen: [position] };
  }

  return {
    getMethod: () => method,
    getQuestion: () => question,
    getPositions: () => positions,
    choose,
  };
}

harden(buildBallot);

export { ChoiceMethod, buildBallot };
