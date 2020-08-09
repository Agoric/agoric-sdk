/* global harden */

import { generateSparseInts } from '@agoric/sparse-ints';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';

function makeBoard(seed = 0) {
  const idToVal = makeStore('boardId');
  const valToId = makeStore('value');
  const sparseInts = generateSparseInts(seed);

  const board = harden({
    // Add if not already present
    getId: value => {
      if (!valToId.has(value)) {
        // Retry until we have a unique id.
        let id;
        do {
          id = sparseInts.next().value.toString();
        } while (idToVal.has(id));

        valToId.init(value, id);
        idToVal.init(id, value);
      }
      return valToId.get(value);
    },
    getValue: id => {
      assert.equal(typeof id, 'string', details`id must be string ${id}`);
      assert(idToVal.has(id), details`board does not have id: ${id}`);
      return idToVal.get(id);
    },
    has: valToId.has,
    ids: () => harden([...idToVal.keys()]),
  });

  return board;
}

export { makeBoard };

/** @typedef {ReturnType<typeof makeBoard>} Board */
