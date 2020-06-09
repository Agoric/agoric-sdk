// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeBoard } from '../../lib/ag-solo/vats/lib-board';

test('makeBoard', async t => {
  try {
    const board = makeBoard();

    const obj1 = harden({});
    const obj2 = harden({});

    t.deepEquals(board.ids(), [], `board is empty to start`);

    const idObj1 = board.getId(obj1);
    t.deepEquals(board.ids(), [idObj1], `board has one id`);

    const idObj2 = board.getId(obj2);
    t.deepEquals(board.ids().length, 2, `board has two ids`);

    t.deepEquals(board.getValue(idObj1), obj1, `id matches value obj1`);
    t.deepEquals(board.getValue(idObj2), obj2, `id matches value obj2`);

    t.deepEquals(board.getId(obj1), idObj1, `value matches id obj1`);
    t.deepEquals(board.getId(obj2), idObj2, `value matches id obj2`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
