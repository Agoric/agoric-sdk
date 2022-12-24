// @ts-check

import '@endo/init/debug.js';

import tmp from 'tmp';
import test from 'ava';

import {
  initSwingStore,
  openSwingStore,
  isSwingStore,
} from '../src/swingStore.js';

/**
 * @param {string} [prefix]
 * @returns {Promise<[string, () => void]>}
 */
const tmpDir = prefix =>
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true, prefix }, (err, name, removeCallback) => {
      if (err) {
        reject(err);
      } else {
        resolve([name, removeCallback]);
      }
    });
  });

function* iterate(kvStore, start, end) {
  if (kvStore.has(start)) {
    yield start;
  }
  let prev = start;
  while (true) {
    const next = kvStore.getNextKey(prev);
    if (!next || next >= end) {
      break;
    }
    yield next;
    prev = next;
  }
}

function checkKVState(t, swingstore) {
  const kv = swingstore.debug.dump().kvEntries;
  t.deepEqual(kv, { foo: 'f', foo1: 'f1', foo3: 'f3' });
}

function testKVStore(t, storage) {
  const { kvStore } = storage.kernelStorage;
  t.falsy(kvStore.has('missing'));
  t.is(kvStore.get('missing'), undefined);

  kvStore.set('foo', 'f');
  t.truthy(kvStore.has('foo'));
  t.is(kvStore.get('foo'), 'f');

  kvStore.set('foo2', 'f2');
  kvStore.set('foo1', 'f1');
  kvStore.set('foo3', 'f3');
  t.is(kvStore.getNextKey('foo'), 'foo1');
  t.is(kvStore.getNextKey('foo1'), 'foo2');
  t.is(kvStore.getNextKey('foo2'), 'foo3');
  t.is(kvStore.getNextKey('foo3'), undefined);
  t.is(kvStore.getNextKey('goo'), undefined);
  t.deepEqual(Array.from(iterate(kvStore, 'foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(iterate(kvStore, 'foo1', 'foo4')), [
    'foo1',
    'foo2',
    'foo3',
  ]);

  kvStore.delete('foo2');
  t.falsy(kvStore.has('foo2'));
  t.is(kvStore.get('foo2'), undefined);
  t.is(kvStore.getNextKey('foo1'), 'foo3');
  t.is(kvStore.getNextKey('foo2'), 'foo3');
  checkKVState(t, storage);
}

test('in-memory kvStore read/write', t => {
  const ss1 = initSwingStore(null);
  testKVStore(t, ss1);
  const serialized = ss1.debug.serialize();
  const ss2 = initSwingStore(null, { serialized });
  checkKVState(t, ss2);
});

test('persistent kvStore read/write/re-open', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  const ss1 = initSwingStore(dbDir);
  testKVStore(t, ss1);
  await ss1.hostStorage.commit();
  await ss1.hostStorage.close();
  t.is(isSwingStore(dbDir), true);

  const ss2 = openSwingStore(dbDir);
  checkKVState(t, ss2);
  await ss2.hostStorage.close();
  t.is(isSwingStore(dbDir), true);
});

test('persistent kvStore maxKeySize write', async t => {
  // Vat collections assume they have 220 characters for their key space.
  // This is based on previous math where LMDB's key size was 511 bytes max
  // and the native UTF-16 encoding of JS strings, minus some overhead
  // for vat store prefixes.
  // However some unicode codepoints may end up serialized as 3 bytes with UTF-8
  // This tests that no matter what, we can write 254 unicode characters in the
  // 0x0800 - 0xFFFF range (single UTF-16 codepoint, but 3 byte UTF-8).

  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  const { kernelStorage, hostStorage } = initSwingStore(dbDir);
  kernelStorage.kvStore.set('€'.repeat(254), 'Money!');
  await hostStorage.commit();
  await hostStorage.close();
});

async function testStreamStore(t, dbDir) {
  const { kernelStorage, hostStorage } = initSwingStore(dbDir);
  const { streamStore } = kernelStorage;
  const { commit, close } = hostStorage;

  const start = streamStore.STREAM_START;
  let s1pos = start;
  s1pos = streamStore.writeStreamItem('st1', 'first', s1pos);
  s1pos = streamStore.writeStreamItem('st1', 'second', s1pos);
  const s1posAlt = s1pos;
  s1pos = streamStore.writeStreamItem('st1', 'third', s1pos);
  let s2pos = streamStore.STREAM_START;
  s2pos = streamStore.writeStreamItem('st2', 'oneth', s2pos);
  s1pos = streamStore.writeStreamItem('st1', 'fourth', s1pos);
  s2pos = streamStore.writeStreamItem('st2', 'twoth', s2pos);
  const s2posAlt = s2pos;
  s2pos = streamStore.writeStreamItem('st2', 'threeth', s2pos);
  s2pos = streamStore.writeStreamItem('st2', 'fourst', s2pos);
  streamStore.closeStream('st1');
  streamStore.closeStream('st2');
  const reader1 = streamStore.readStream('st1', start, s1pos);
  t.deepEqual(Array.from(reader1), ['first', 'second', 'third', 'fourth']);
  s2pos = streamStore.writeStreamItem('st2', 're3', s2posAlt);
  streamStore.closeStream('st2');
  const reader2 = streamStore.readStream('st2', start, s2pos);
  t.deepEqual(Array.from(reader2), ['oneth', 'twoth', 're3']);

  const reader1alt = streamStore.readStream('st1', s1posAlt, s1pos);
  t.deepEqual(Array.from(reader1alt), ['third', 'fourth']);

  const emptyPos = streamStore.writeStreamItem('empty', 'filler', start);
  streamStore.closeStream('empty');
  const readerEmpty = streamStore.readStream('empty', emptyPos, emptyPos);
  t.deepEqual(Array.from(readerEmpty), []);
  const readerEmpty2 = streamStore.readStream('empty', start, start);
  t.deepEqual(Array.from(readerEmpty2), []);

  await commit();
  await close();
}

test('in-memory streamStore read/write', async t => {
  await testStreamStore(t, null);
});

test('persistent streamStore read/write', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  await testStreamStore(t, dbDir);
});

async function testStreamStoreModeInterlock(t, dbDir) {
  const { kernelStorage, hostStorage } = initSwingStore(dbDir);
  const { streamStore } = kernelStorage;
  const { commit, close } = hostStorage;
  const start = streamStore.STREAM_START;

  const s1pos = streamStore.writeStreamItem('st1', 'first', start);
  streamStore.closeStream('st1');

  const reader = streamStore.readStream('st1', start, s1pos);
  t.throws(() => streamStore.readStream('st1', start, s1pos), {
    message: `can't read stream "st1" because it's already in use`,
  });
  t.throws(() => streamStore.writeStreamItem('st1', 'second', s1pos), {
    message: `can't write stream "st1" because it's already in use`,
  });
  streamStore.closeStream('st1');
  t.throws(() => reader.next(), {
    message: `can't read stream "st1", it's been closed`,
  });

  streamStore.closeStream('nonexistent');

  await commit();
  await close();
}

test('in-memory streamStore mode interlock', async t => {
  await testStreamStoreModeInterlock(t, null);
});

test('persistent streamStore mode interlock', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  await testStreamStoreModeInterlock(t, dbDir);
});

test('streamStore abort', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const { kernelStorage, hostStorage } = initSwingStore(dbDir);
  const { streamStore } = kernelStorage;
  const { commit, close } = hostStorage;
  const start = streamStore.STREAM_START;

  const s1pos = streamStore.writeStreamItem('st1', 'first', start);
  streamStore.closeStream('st1');
  await commit(); // really write 'first'

  streamStore.writeStreamItem('st2', 'second', s1pos);
  streamStore.closeStream('st1');
  // abort is close without commit
  await close();

  const { streamStore: ss2 } = openSwingStore(dbDir).kernelStorage;
  const reader = ss2.readStream('st1', start, s1pos);
  t.deepEqual(Array.from(reader), ['first']); // and not 'second'
});
