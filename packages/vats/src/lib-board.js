// @ts-check

import { generateSparseInts } from '@agoric/sparse-ints';
import { assert, details as X, q } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { makeStore } from '@agoric/store';
import { models as crcmodels } from 'polycrc';

import './types.js';

const CRC_NUM_DIGITS = 2;
const ID_REGEXP = new RegExp(`^[0-9]{${CRC_NUM_DIGITS + 1},}$`);

/**
 * We calculate a CRC, ensuring it's of CRC_NUM_DIGITS length.
 *
 * @param {number} num
 * @returns {string}
 */
const calcCrc = num => {
  // The explicit use of crcmodels is to avoid a typing error.
  // Add 1 to guarantee we don't get a 0.
  const crc = crcmodels.crc6.calculate(num) + 1;
  const crcStr = crc.toString().padStart(CRC_NUM_DIGITS, '0');
  assert(
    crcStr.length <= CRC_NUM_DIGITS,
    `CRC too big for its britches ${crcStr}`,
  );
  return crcStr;
};

/**
 * Create a board to post things on.
 *
 * @param {number} [seed=0]
 * @returns {Board}
 */
function makeBoard(seed = 0) {
  const idToVal = makeStore('boardId');
  const valToId = makeStore('value');
  const sparseInts = generateSparseInts(seed);

  /** @type {Board} */
  const board = Far('Board', {
    // Add if not already present
    getId: value => {
      if (!valToId.has(value)) {
        // Retry until we have a unique id.
        let id;
        do {
          const num = /** @type {number} */ (sparseInts.next().value);
          id = `${num}${calcCrc(num)}`;
        } while (idToVal.has(id));

        valToId.init(value, id);
        idToVal.init(id, value);
      }
      return valToId.get(value);
    },
    getValue: id => {
      assert.equal(typeof id, 'string', X`id must be string ${id}`);
      assert(
        id.match(ID_REGEXP),
        X`id must consist of at least ${q(CRC_NUM_DIGITS + 1)} digits`,
      );
      const num = Number(id.slice(0, -CRC_NUM_DIGITS));
      const allegedCrc = id.slice(-CRC_NUM_DIGITS);
      const crc = calcCrc(num);
      assert.equal(
        allegedCrc,
        crc,
        X`id is probably a typo, cannot verify CRC: ${id}`,
      );
      assert(idToVal.has(id), X`board does not have id: ${id}`);
      return idToVal.get(id);
    },
    has: valToId.has,
    ids: () => harden([...idToVal.keys()]),
  });

  return board;
}

export { makeBoard };
