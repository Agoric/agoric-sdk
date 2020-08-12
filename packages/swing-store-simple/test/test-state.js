import fs from 'fs';
import path from 'path';

import test from 'ava';
import {
  initSwingStore,
  openSwingStore,
  getAllState,
  isSwingStore,
} from '../simpleSwingStore';

function testStorage(t, storage) {
 t.falsy(storage.has('missing'));
 t.is(storage.get('missing'), undefined);

  storage.set('foo', 'f');
 t.assert(storage.has('foo'));
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

test('storageInMemory', t => {
  const { storage } = initSwingStore();
  testStorage(t, storage);
 return; // t.end();
});

test('storageInFile', t => {
  fs.rmdirSync('testdb', { recursive: true });
 t.is(isSwingStore('testdb'), false);
  const { storage, commit, close } = initSwingStore('testdb');
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();
 t.is(isSwingStore('testdb'), true);

  const { storage: after } = openSwingStore('testdb');
  t.deepEqual(getAllState(after), before, 'check state after reread');
 t.is(isSwingStore('testdb'), true);
 return; // t.end();
});

test('rejectLMDB', t => {
  const notSimpleDir = 'testdb-lmdb';
  fs.mkdirSync(notSimpleDir, { recursive: true });
  fs.writeFileSync(path.resolve(notSimpleDir, 'data.mdb'), 'some data\n');
  fs.writeFileSync(path.resolve(notSimpleDir, 'lock.mdb'), 'lock stuff\n');
 t.is(isSwingStore(notSimpleDir), false);
 return; // t.end();
});

test.onFinish(() => fs.rmdirSync('testdb', { recursive: true }));
test.onFinish(() => fs.rmdirSync('testdb-lmdb', { recursive: true }));
