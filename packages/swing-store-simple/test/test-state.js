import '@agoric/install-ses';

import fs from 'fs';
import path from 'path';

import test from 'ava';
import {
  initSwingStore,
  openSwingStore,
  getAllState,
  isSwingStore,
} from '../src/simpleSwingStore.js';

function testStorage(t, kvStore) {
  t.falsy(kvStore.has('missing'));
  t.is(kvStore.get('missing'), undefined);

  kvStore.set('foo', 'f');
  t.truthy(kvStore.has('foo'));
  t.is(kvStore.get('foo'), 'f');

  kvStore.set('foo2', 'f2');
  kvStore.set('foo1', 'f1');
  kvStore.set('foo3', 'f3');
  t.deepEqual(Array.from(kvStore.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(kvStore.getKeys('foo1', 'foo4')), [
    'foo1',
    'foo2',
    'foo3',
  ]);

  kvStore.delete('foo2');
  t.falsy(kvStore.has('foo2'));
  t.is(kvStore.get('foo2'), undefined);
  t.deepEqual(Array.from(kvStore.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  const reference = {
    foo: 'f',
    foo1: 'f1',
    foo3: 'f3',
  };
  t.deepEqual(getAllState(kvStore), reference, 'check state after changes');
}

test('storageInMemory', t => {
  const { kvStore } = initSwingStore();
  testStorage(t, kvStore);
});

test('storageInFile', t => {
  const dbDir = 'testdb';
  t.teardown(() => fs.rmdirSync(dbDir, { recursive: true }));
  fs.rmdirSync(dbDir, { recursive: true });
  t.is(isSwingStore(dbDir), false);
  const { kvStore, commit, close } = initSwingStore(dbDir);
  testStorage(t, kvStore);
  commit();
  const before = getAllState(kvStore);
  close();
  t.is(isSwingStore(dbDir), true);

  const { kvStore: after } = openSwingStore(dbDir);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.is(isSwingStore(dbDir), true);
});

test('rejectLMDB', t => {
  const notSimpleDir = 'testdb-lmdb';
  t.teardown(() => fs.rmdirSync(notSimpleDir, { recursive: true }));
  fs.mkdirSync(notSimpleDir, { recursive: true });
  fs.writeFileSync(path.resolve(notSimpleDir, 'data.mdb'), 'some data\n');
  fs.writeFileSync(path.resolve(notSimpleDir, 'lock.mdb'), 'lock stuff\n');
  t.is(isSwingStore(notSimpleDir), false);
});
