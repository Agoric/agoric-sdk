import { Far } from '@agoric/marshal';
import { makeBoard } from './lib-board';

export function buildRootObject(_vatPowers) {
  const board = makeBoard();
  return Far('board', { getBoard: () => board });
}
