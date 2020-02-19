import fs from 'fs';

import { test } from 'tape-promise/tape';
import {
  makeMemorySwingStore,
  makeSimpleSwingStore,
  getAllState,
} from '../simpleSwingStore';

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

  const reference = {
    foo: 'f',
    foo1: 'f1',
    foo3: 'f3',
  };
  t.deepEqual(getAllState(storage), reference, 'check state after changes');
}

test('storageInMemory', t => {
  const { storage } = makeMemorySwingStore();
  testStorage(t, storage);
  t.end();
});

test('storageInFile', t => {
  const { storage, commit, close } = makeSimpleSwingStore('.', 'stuff', true);
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();

  const { storage: after } = makeSimpleSwingStore('.', 'stuff', false);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.end();
});

test.onFinish(() => fs.unlinkSync('stuff.jsonlines'));
