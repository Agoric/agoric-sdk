// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { Far } from '@endo/far';
import { makeStore } from '@agoric/store';
import { crc6 } from './crc.js';

import './types.js';

export const DEFAULT_CRC_DIGITS = 2;
export const DEFAULT_PREFIX = 'board0';

/**
 * We calculate a CRC, ensuring it's of CRC_NUM_DIGITS length.
 *
 * @param {number | string} data
 * @param {number} crcDigits
 * @returns {string}
 */
const calcCrc = (data, crcDigits) => {
  // The explicit use of crcmodels is to avoid a typing error.
  // Add 1 to guarantee we don't get a 0.
  const crc = crc6.calculate(data) + 1;
  const crcStr = crc.toString().padStart(crcDigits, '0');
  assert(crcStr.length <= crcDigits, `CRC too big for its britches ${crcStr}`);
  return crcStr;
};

/**
 * Create a board to post things on.
 *
 * @param {bigint | number} [initSequence]
 * @param {Object} [options]
 * @param {string} [options.prefix]
 * @param {number} [options.crcDigits]
 * @returns {Board}
 */
function makeBoard(
  initSequence = 0,
  { prefix = DEFAULT_PREFIX, crcDigits = DEFAULT_CRC_DIGITS } = {},
) {
  const DIGITS_REGEXP = new RegExp(`^[0-9]{${crcDigits + 1},}$`);
  let lastSequence = BigInt(initSequence);
  const idToVal = makeStore('boardId');
  const valToId = makeStore('value');

  /** @type {Board} */
  const board = Far('Board', {
    // Add if not already present
    getId: value => {
      if (!valToId.has(value)) {
        lastSequence += 1n;
        const seq = lastSequence;

        // Append the CRC, so that the last part of the board ID is
        // well-distributed.
        const crcInput = `${prefix}${seq}`;
        const crc = calcCrc(crcInput, crcDigits);

        const id = `${prefix}${crc}${seq}`;

        valToId.init(value, id);
        idToVal.init(id, value);
      }
      return valToId.get(value);
    },
    getValue: id => {
      assert.typeof(id, 'string', X`id must be string: ${id}`);
      assert(id.startsWith(prefix), X`id must start with ${prefix}: ${id}`);
      const digits = id.slice(prefix.length);
      assert(
        digits.match(DIGITS_REGEXP),
        X`id must end in at least ${q(crcDigits + 1)} digits: ${id}`,
      );
      const seq = digits.slice(crcDigits);
      const allegedCrc = digits.slice(0, crcDigits);
      const crcInput = `${prefix}${seq}`;
      const crc = calcCrc(crcInput, crcDigits);
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
