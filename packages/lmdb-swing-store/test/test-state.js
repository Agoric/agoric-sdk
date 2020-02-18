import fs from 'fs';

import { test } from 'tape-promise/tape';
import { makeLMDBSwingStore } from '../lmdbSwingStore';

function checkState(t, got, expected, msg) {
  function compareStrings(a, b) {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  }
  t.deepEqual(got.sort(compareStrings), expected.sort(compareStrings), msg);
}

function getEverything(storage) {
  const stuff = [];
  for (const key of Array.from(storage.getKeys('', ''))) {
    stuff.push([key, storage.get(key)]);
  }
  return stuff;
}

function testStorage(t, storage) {
  t.notOk(storage.has('missing'));
  t.equal(storage.get('missing'), undefined);

  storage.set('foo', 'f');
  t.ok(storage.has('foo'));
  t.equal(storage.get('foo'), 'f');

  storage.set('foo2', 'f2');
  storage.set('foo1', 'f1');
  storage.set('foo3', 'f3');
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo4')), [
    'foo1',
    'foo2',
    'foo3',
  ]);

  storage.delete('foo2');
  t.notOk(storage.has('foo2'));
  t.equal(storage.get('foo2'), undefined);
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  const reference = [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ];
  checkState(t, getEverything(storage), reference, 'checkState after changes');
}

test('storageInLMDB', t => {
  const { storage, commit, close } = makeLMDBSwingStore('.', 'stuff', true);
  testStorage(t, storage);
  commit();
  const before = getEverything(storage);
  close();

  const { storage: after } = makeLMDBSwingStore('.', 'stuff', false);
  checkState(t, getEverything(after), before, 'checkState after reread');

  t.end();
});

test.onFinish(() => {
  fs.unlinkSync('data.mdb');
  fs.unlinkSync('lock.mdb');
});
