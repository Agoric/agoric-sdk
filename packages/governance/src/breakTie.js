/* eslint-disable no-plusplus */
// @ts-check

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/12646864
 *
 * @param {Position[]} array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Takes a list of positions and returns n tie break winners
 *
 * @param {Position[]} positions
 * @param {number} n
 * @returns {Position[]}
 */
export const breakTie = (positions, n) => {
  const tieWinners = [];
  const shuffleArray = positions.slice();

  for (let i = 0; i < n; i++) {
    shuffle(shuffleArray);
    const element = shuffleArray.shift();
    if (element) tieWinners.push(element);
  }

  return tieWinners;
};
