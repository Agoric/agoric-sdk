// import LMDB before SES lockdown, as workaround for
// https://github.com/Agoric/SES-shim/issues/308
import 'node-lmdb';
import '@agoric/install-ses';

import fs from 'fs';
import path from 'path';

import test from 'ava';
import { getAllState } from '@agoric/swing-store-simple';

import {
  initSwingStore,
  openSwingStore,
  isSwingStore,
} from '../lmdbSwingStore';

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

test('storageInLMDB under SES', t => {
  const dbDir = 'testdb';
  t.teardown(() => fs.rmdirSync(dbDir, { recursive: true }));
  fs.rmdirSync(dbDir, { recursive: true });
  t.is(isSwingStore(dbDir), false);
  const { storage, commit, close } = initSwingStore(dbDir);
  testStorage(t, storage);
  commit();
  const before = getAllState(storage);
  close();
  t.is(isSwingStore(dbDir), true);

  const { storage: after } = openSwingStore(dbDir);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.is(isSwingStore(dbDir), true);
});

test('rejectSimple under SES', t => {
  const simpleDir = 'testdb-simple';
  t.teardown(() => fs.rmdirSync(simpleDir, { recursive: true }));
  fs.mkdirSync(simpleDir, { recursive: true });
  fs.writeFileSync(
    path.resolve(simpleDir, 'swingset-kernel-state.jsonlines'),
    'some data\n',
  );
  t.is(isSwingStore(simpleDir), false);
});
