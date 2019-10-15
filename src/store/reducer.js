import { NEW_GAME, PLAY_TURN } from './types';
import { newGame, playTurn } from './operations';

export const initialState = newGame();

export function reducer(state, action) {
  const { type, payload } = action;
  switch (type) {
    case NEW_GAME:
      return newGame();
    case PLAY_TURN:
      return playTurn(payload);
    default:
      throw new TypeError();
  }
}
