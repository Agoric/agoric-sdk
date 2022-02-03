import { Far } from '@endo/far';
import { makeBoard } from './lib-board.js';

export function buildRootObject(_vatPowers) {
  const board = makeBoard();
  return Far('board', { getBoard: () => board });
}
