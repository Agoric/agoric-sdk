// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { Far } from '@endo/far';
import { makeBoard } from '../src/lib-board.js';

test('makeBoard', async t => {
  const board = makeBoard();

  const obj1 = Far('obj1', { lookup: async (...path) => path });
  const obj2 = Far('obj2', {});

  t.deepEqual(board.ids(), [], `board is empty to start`);
  t.is(await board.lookup(), board, 'empty lookup returns board');

  await t.throwsAsync(board.lookup('board0371'), {
    message: /board does not have id: "board0371"/,
  });

  const idObj1 = board.getId(obj1);
  t.is(idObj1, 'board0371');
  t.deepEqual(board.ids(), [idObj1], `board has one id`);

  t.is(await board.lookup('board0371'), obj1, 'id lookup returns obj1');
  t.deepEqual(
    await board.lookup('board0371', 'a', 'b', 'c'),
    ['a', 'b', 'c'],
    'path lookup returns path',
  );

  const idObj2 = board.getId(obj2);
  t.is(idObj2, 'board0592');
  t.is(await board.lookup('board0592'), obj2, 'id lookup returns obj2');
  await t.throwsAsync(board.lookup('board0592', 'a', 'b', 'c'), {
    message: /target has no method "lookup"/,
  });
  t.deepEqual(board.ids().length, 2, `board has two ids`);

  t.deepEqual(board.getValue(idObj1), obj1, `id matches value obj1`);
  t.deepEqual(board.getValue(idObj2), obj2, `id matches value obj2`);

  t.deepEqual(board.getId(obj1), idObj1, `value matches id obj1`);
  t.deepEqual(board.getId(obj2), idObj2, `value matches id obj2`);

  const board2 = makeBoard(undefined, { prefix: 'tooboard' });
  const idObj1b = board2.getId(obj1);
  t.is(idObj1b, 'tooboard311');
  const idObj2b = board2.getId(obj2);
  t.is(idObj2b, 'tooboard012');
});

const testBoardMarshaller = async (t, board, marshaller, publishing) => {
  const published = Far('published', {});
  const unpublished = Far('unpublished', {});

  const published1id = board.getId(published);
  const ser = marshaller.serialize(
    harden({
      published1: published,
      unpublished1: unpublished,
      published2: published,
      unpublished2: unpublished,
    }),
  );
  const pub1ser = `{"@qclass":"slot","iface":"Alleged: published","index":0}`;
  const pub2ser = `{"@qclass":"slot","index":0}`;
  const unpub1ser = `{"@qclass":"slot","iface":"Alleged: unpublished","index":1}`;
  const unpub2ser = `{"@qclass":"slot","index":1}`;
  t.is(
    ser.body,
    `{"published1":${pub1ser},"published2":${pub2ser},"unpublished1":${unpub1ser},"unpublished2":${unpub2ser}}`,
  );
  t.is(ser.slots.length, 2);
  t.is(ser.slots[0], published1id);
  if (publishing) {
    t.assert(ser.slots[1].startsWith('board0'));
  } else {
    t.is(ser.slots[1], null);
  }

  const { published1, unpublished1, published2, unpublished2 } =
    marshaller.unserialize(ser);
  t.is(published1, published);
  t.is(published2, published);
  t.is(published1.toString(), '[object Alleged: published]');
  t.is(published2.toString(), '[object Alleged: published]');
  t.is(unpublished1, unpublished2);
  if (publishing) {
    t.is(unpublished1, unpublished);
    t.is(unpublished2, unpublished);
    t.is(unpublished1.toString(), '[object Alleged: unpublished]');
    t.is(unpublished2.toString(), '[object Alleged: unpublished]');
  } else {
    t.not(unpublished1, unpublished);
    t.not(unpublished2, unpublished);
    t.is(
      unpublished1.toString(),
      '[object Alleged: INACCESSIBLE: unpublished]',
    );
    t.is(
      unpublished2.toString(),
      '[object Alleged: INACCESSIBLE: unpublished]',
    );

    // Separate marshals do not compare.
    const unpublished3 = marshaller.unserialize(
      marshaller.serialize(unpublished),
    );
    t.not(unpublished3, unpublished);
    t.not(unpublished3, unpublished1);
    t.not(unpublished3, unpublished2);
  }
};

test('getPublishingMarshaller round trips unpublished objects', async t => {
  const board = makeBoard();
  const marshaller = board.getPublishingMarshaller();
  await testBoardMarshaller(t, board, marshaller, true);
});

test(`getReadonlyMarshaller doesn't leak unpublished objects`, async t => {
  const board = makeBoard();
  const marshaller = board.getReadonlyMarshaller();
  await testBoardMarshaller(t, board, marshaller, false);
});
