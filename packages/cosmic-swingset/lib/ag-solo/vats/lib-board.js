// @ts-check
/* global harden */

import { generateSparseInts } from '@agoric/sparse-ints';
import { assert, details, q } from '@agoric/assert';
import makeStore from '@agoric/store';
import polycrc from '@agoric/polycrc';

const { crc6 } = polycrc;

const CRC_NUM_DIGITS = 2;
const ID_REGEXP = new RegExp(`^[1-9][0-9]{${CRC_NUM_DIGITS},}$`);

/**
 * We calculate a CRC, ensuring it's of CRC_NUM_DIGITS length.
 * @param {number} num
 * @return {string}
 */
const calcCrc = num => {
  // Add 1 to guarantee we don't get a 0.
  const crc = crc6(num) + 1;
  const crcStr = crc.toString().padStart(CRC_NUM_DIGITS, '0');
  assert(
    crcStr.length <= CRC_NUM_DIGITS,
    `CRC too big for its britches ${crcStr}`,
  );
  return crcStr;
};

/**
 * @typedef {Object} Board
 * @property {(id: string) => any} getValue
 * @property {(value: any) => string} getId
 * @property {(value: any) => boolean} has
 * @property {() => string[]} ids```
 */

/**
 * Create a board to post things on.
 * @param {number} [seed=0]
 * @returns {Board}
 */
function makeBoard(seed = 0) {
  const idToVal = makeStore('boardId');
  const valToId = makeStore('value');
  const sparseInts = generateSparseInts(seed);

  /** @type {Board} */
  const board = harden({
    // Add if not already present
    getId: value => {
      if (!valToId.has(value)) {
        // Retry until we have a unique id.
        let id;
        do {
          const num = sparseInts.next().value;
          id = `${num.toString()}${calcCrc(num)}`;
        } while (idToVal.has(id));

        valToId.init(value, id);
        idToVal.init(id, value);
      }
      return valToId.get(value);
    },
    getValue: id => {
      assert.equal(typeof id, 'string', details`id must be string ${id}`);
      assert(
        id.match(ID_REGEXP),
        details`id must consist of at least ${q(CRC_NUM_DIGITS + 1)} digits`,
      );
      const num = Number(id.slice(0, -CRC_NUM_DIGITS));
      const allegedCrc = id.slice(-CRC_NUM_DIGITS);
      const crc = calcCrc(num);
      assert.equal(
        allegedCrc,
        crc,
        details`id is probably a typo, cannot verify CRC: ${id}`,
      );
      assert(idToVal.has(id), details`board does not have id: ${id}`);
      return idToVal.get(id);
    },
    has: valToId.has,
    ids: () => harden([...idToVal.keys()]),
  });

  return board;
}

export { makeBoard };
