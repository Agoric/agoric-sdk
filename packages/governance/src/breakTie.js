/**
 * @import {Position} from './types.js';
 */

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/12646864
 *
 * @param {Position[]} array
 */
function shuffle(array) {
  const newArray = array.slice();

  for (let i = newArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

/**
 * Takes a list of positions and returns n tie break winners
 *
 * @param {Position[]} positions
 * @param {number} n
 * @returns {Position[]}
 */
export const breakTie = (positions, n) => {
  return shuffle(positions).slice(0, n);
};
