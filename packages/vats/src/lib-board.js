// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
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
 * @param {object} [options]
 * @param {string} [options.prefix]
 * @param {number} [options.crcDigits]
 */
function makeBoard(
  initSequence = 0,
  { prefix = DEFAULT_PREFIX, crcDigits = DEFAULT_CRC_DIGITS } = {},
) {
  const DIGITS_REGEXP = new RegExp(`^[0-9]{${crcDigits + 1},}$`);
  let lastSequence = BigInt(initSequence);
  const idToVal = makeStore('boardId');
  const valToId = makeStore('value');

  const ifaceAllegedPrefix = 'Alleged: ';
  const ifaceInaccessiblePrefix = 'SEVERED: ';
  const slotToVal = (slot, iface) => {
    if (slot !== null) {
      // eslint-disable-next-line no-use-before-define
      return board.getValue(slot);
    }

    // Private object.
    if (typeof iface === 'string' && iface.startsWith(ifaceAllegedPrefix)) {
      iface = iface.slice(ifaceAllegedPrefix.length);
    }
    return Far(`${ifaceInaccessiblePrefix}${iface}`, {});
  };

  // Create a marshaller that just looks up objects, not publish them.
  const readonlyMarshaller = Far('board readonly marshaller', {
    ...makeMarshal(val => {
      if (!valToId.has(val)) {
        // Unpublished value.
        return null;
      }

      // Published value.
      return valToId.get(val);
    }, slotToVal),
  });

  // Create a marshaller useful for publishing all ocaps.
  const publishingMarshaller = Far('board publishing marshaller', {
    ...makeMarshal(
      // Always put the value in the board.
      // eslint-disable-next-line no-use-before-define
      val => board.getId(val),
      slotToVal,
    ),
  });

  const board = Far('Board', {
    getPublishingMarshaller: () => publishingMarshaller,
    getReadonlyMarshaller: () => readonlyMarshaller,
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
    // Adapter for lookup() protocol.
    lookup: async (...path) => {
      if (path.length === 0) {
        return board;
      }
      const [first, ...rest] = path;
      const firstValue = board.getValue(first);
      if (rest.length === 0) {
        return firstValue;
      }
      return E(firstValue).lookup(...rest);
    },
    has: valToId.has,
    ids: () => harden([...idToVal.keys()]),
  });

  return board;
}

export { makeBoard };
