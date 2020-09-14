import { makeBoard } from './lib-board';

export function buildRootObject(_vatPowers) {
  const board = makeBoard();
  return harden({ getBoard: () => board });
}
