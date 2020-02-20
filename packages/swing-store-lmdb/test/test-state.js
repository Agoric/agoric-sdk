import fs from 'fs';

import { test } from 'tape-promise/tape';
import { getAllState } from '@agoric/swing-store-simple';

import { makeSwingStore } from '../lmdbSwingStore';

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

test('storageInLMDB', t => {
  const { storage, commit, close } = makeSwingStore('testdb', true);
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();

  const { storage: after } = makeSwingStore('testdb', false);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.end();
});

test.onFinish(() => fs.rmdirSync('testdb', { recursive: true }));
