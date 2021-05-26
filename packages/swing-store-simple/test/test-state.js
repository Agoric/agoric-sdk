import '@agoric/install-ses';

import fs from 'fs';
import path from 'path';

import test from 'ava';
import {
  initSwingStore,
  openSwingStore,
  getAllState,
  isSwingStore,
} from '../src/simpleSwingStore';

function testKVStore(t, kvStore) {
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
  testKVStore(t, kvStore);
});

test('storageInFile', t => {
  const dbDir = 'testdb';
  t.teardown(() => fs.rmdirSync(dbDir, { recursive: true }));
  fs.rmdirSync(dbDir, { recursive: true });
  t.is(isSwingStore(dbDir), false);
  const { kvStore, commit, close } = initSwingStore(dbDir);
  testKVStore(t, kvStore);
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

test('streamStore read/write', t => {
  const { streamStore, commit, close } = initSwingStore();

  let s1pos = streamStore.STREAM_START;
  const writer1 = streamStore.openWriteStream('st1');
  s1pos = writer1('first', s1pos);
  s1pos = writer1('second', s1pos);
  const s1posAlt = { ...s1pos };
  const writer2 = streamStore.openWriteStream('st2');
  s1pos = writer1('third', s1pos);
  let s2pos = { itemCount: 0 };
  s2pos = writer2('oneth', s2pos);
  s1pos = writer1('fourth', s1pos);
  s2pos = writer2('twoth', s2pos);
  const s2posAlt = { ...s2pos };
  s2pos = writer2('threeth', s2pos);
  s2pos = writer2('fourst', s2pos);
  streamStore.closeStream('st1');
  streamStore.closeStream('st2');
  const reader1 = streamStore.openReadStream(
    'st1',
    streamStore.STREAM_START,
    s1pos,
  );
  const reads1 = [];
  for (const item of reader1) {
    reads1.push(item);
  }
  t.deepEqual(reads1, ['first', 'second', 'third', 'fourth']);
  const writer2alt = streamStore.openWriteStream('st2');
  s2pos = writer2alt('re3', s2posAlt);
  streamStore.closeStream('st2');
  const reader2 = streamStore.openReadStream(
    'st2',
    streamStore.STREAM_START,
    s2pos,
  );
  const reads2 = [];
  for (const item of reader2) {
    reads2.push(item);
  }
  t.deepEqual(reads2, ['oneth', 'twoth', 're3']);

  const reader1alt = streamStore.openReadStream('st1', s1posAlt, s1pos);
  const reads1alt = [];
  for (const item of reader1alt) {
    reads1alt.push(item);
  }
  t.deepEqual(reads1alt, ['third', 'fourth']);

  const writerEmpty = streamStore.openWriteStream('empty');
  const emptyPos = writerEmpty('filler', streamStore.STREAM_START);
  streamStore.closeStream('empty');
  const readerEmpty = streamStore.openReadStream('empty', emptyPos, emptyPos);
  const readsEmpty = [];
  for (const item of readerEmpty) {
    readsEmpty.push(item);
  }
  t.deepEqual(readsEmpty, []);
  const readerEmpty2 = streamStore.openReadStream(
    'empty',
    streamStore.STREAM_START,
    streamStore.STREAM_START,
  );
  const readsEmpty2 = [];
  for (const item of readerEmpty2) {
    readsEmpty2.push(item);
  }
  t.deepEqual(readsEmpty2, []);

  commit();
  close();
});

test('streamStore mode interlock', t => {
  const { streamStore, commit, close } = initSwingStore();

  const writer = streamStore.openWriteStream('st1');
  const s1pos = writer('first', streamStore.STREAM_START);

  t.throws(
    () => streamStore.openReadStream('st1', streamStore.STREAM_START, s1pos),
    {
      message: `can't read stream "st1" because it's already in use`,
    },
  );
  t.throws(() => streamStore.openWriteStream('st1', s1pos), {
    message: `can't write stream "st1" because it's already in use`,
  });
  streamStore.closeStream('st1');
  t.throws(() => writer('second', streamStore.STREAM_START), {
    message: `can't write to closed stream "st1"`,
  });

  const reader = streamStore.openReadStream(
    'st1',
    streamStore.STREAM_START,
    s1pos,
  );
  t.throws(
    () => streamStore.openReadStream('st1', streamStore.STREAM_START, s1pos),
    {
      message: `can't read stream "st1" because it's already in use`,
    },
  );
  t.throws(() => streamStore.openWriteStream('st1'), {
    message: `can't write stream "st1" because it's already in use`,
  });
  streamStore.closeStream('st1');
  t.throws(() => reader.next(), {
    message: `can't read stream "st1", it's been closed`,
  });

  streamStore.closeStream('nonexistent');

  commit();
  close();
});
