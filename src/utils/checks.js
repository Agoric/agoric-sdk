export function isBoardFull(board) {
  for (let i = 0; i < board.length; i += 1) {
    if (!(board[i] > 0)) {
      return false;
    }
  }
  return true;
}

export function getWinner(board) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of wins) {
    const player = board[a];
    if (player > 0 && player === board[b] && player === board[c]) {
      return player;
    }
  }
  return 0;
}
