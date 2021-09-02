import fs from 'fs';

import test from 'ava';
import {
  initJSONStore,
  openJSONStore,
  getAllState,
  isJSONStore,
} from '../src/json-store.js';

function rimraf(dirPath) {
  try {
    // Node.js 16.8.0 warns:
    // In future versions of Node.js, fs.rmdir(path, { recursive: true }) will
    // be removed. Use fs.rm(path, { recursive: true }) instead
    if (fs.rmSync) {
      fs.rmSync(dirPath, { recursive: true });
    } else {
      fs.rmdirSync(dirPath, { recursive: true });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

function testStorage(t, storage) {
  t.falsy(storage.has('missing'));
  t.is(storage.get('missing'), undefined);

  storage.set('foo', 'f');
  t.truthy(storage.has('foo'));
  t.is(storage.get('foo'), 'f');

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
  t.falsy(storage.has('foo2'));
  t.is(storage.get('foo2'), undefined);
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  const reference = {
    foo: 'f',
    foo1: 'f1',
    foo3: 'f3',
  };
  t.deepEqual(getAllState(storage), reference, 'check state after changes');
}

test('storageInFile', t => {
  const dbDir = 'testdb';
  t.teardown(() => rimraf(dbDir));
  rimraf(dbDir);
  t.is(isJSONStore(dbDir), false);
  const { storage, commit, close } = initJSONStore(dbDir);
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();
  t.is(isJSONStore(dbDir), true);

  const { storage: after } = openJSONStore(dbDir);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.is(isJSONStore(dbDir), true);
});
