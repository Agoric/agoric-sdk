import fs from 'fs';
import path from 'path';

import { test } from 'tape-promise/tape';
import {
  initSwingStore,
  openSwingStore,
  getAllState,
  isSwingStore,
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
  const { storage } = initSwingStore();
  testStorage(t, storage);
  t.end();
});

test('storageInFile', t => {
  fs.rmdirSync('testdb', { recursive: true });
  t.equal(isSwingStore('testdb'), false);
  const { storage, commit, close } = initSwingStore('testdb');
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();
  t.equal(isSwingStore('testdb'), true);

  const { storage: after } = openSwingStore('testdb');
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.equal(isSwingStore('testdb'), true);
  t.end();
});

test('rejectLMDB', t => {
  const notSimpleDir = 'testdb-lmdb';
  fs.mkdirSync(notSimpleDir, { recursive: true });
  fs.writeFileSync(path.resolve(notSimpleDir, 'data.mdb'), 'some data\n');
  fs.writeFileSync(path.resolve(notSimpleDir, 'lock.mdb'), 'lock stuff\n');
  t.equal(isSwingStore(notSimpleDir), false);
  t.end();
});

test.onFinish(() => fs.rmdirSync('testdb', { recursive: true }));
test.onFinish(() => fs.rmdirSync('testdb-lmdb', { recursive: true }));
