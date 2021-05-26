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
} from '../src/lmdbSwingStore';

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

test('storageInLMDB under SES', t => {
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
