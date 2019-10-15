export function newGame() {
  return {
    board: Array(9).fill(null),
    player: 1,
  };
}

export function playTurn({ board, player, index }) {
  if (board[index] > 0) {
    return {
      board,
      player,
    };
  }

  board = board.slice();
  board[index] = player;

  player = 3 - player;

  return {
    board,
    player,
  };
}
