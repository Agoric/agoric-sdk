import { NEW_GAME, PLAY_TURN } from './types';

export const newGame = () => ({
  type: NEW_GAME,
});

export const playTurn = (board, player, index) => ({
  type: PLAY_TURN,
  payload: { board, player, index },
});
