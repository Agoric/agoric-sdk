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

function makeExportLog() {
  const exportLog = [];
  return {
    callback(updates) {
      exportLog.push(updates);
    },
    getLog() {
      return exportLog;
    },
  };
}

function checkKVState(t, swingstore) {
  const kv = swingstore.debug.dump().kvEntries;
  t.deepEqual(kv, { foo: 'f', foo1: 'f1', foo3: 'f3' });
}

function testKVStore(t, storage, exportLog) {
  const { kvStore, startCrank, endCrank } = storage.kernelStorage;
  startCrank();
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
  endCrank();
  startCrank();

  kvStore.delete('foo2');
  t.falsy(kvStore.has('foo2'));
  t.is(kvStore.get('foo2'), undefined);
  t.is(kvStore.getNextKey('foo1'), 'foo3');
  t.is(kvStore.getNextKey('foo2'), 'foo3');
  endCrank();
  checkKVState(t, storage);
  t.deepEqual(exportLog.getLog(), [
    [
      ['foo', 'f'],
      ['foo1', 'f1'],
      ['foo2', 'f2'],
      ['foo3', 'f3'],
    ],
    [['foo2', null]],
  ]);
}

test('in-memory kvStore read/write', t => {
  const exportLog = makeExportLog();
  const ss1 = initSwingStore(null, { exportCallback: exportLog.callback });
  testKVStore(t, ss1, exportLog);
  const serialized = ss1.debug.serialize();
  const ss2 = initSwingStore(null, { serialized });
  checkKVState(t, ss2);
});

test('persistent kvStore read/write/re-open', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  const exportLog = makeExportLog();
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  const ss1 = initSwingStore(dbDir, { exportCallback: exportLog.callback });
  testKVStore(t, ss1, exportLog);
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

async function testTranscriptStore(t, dbDir) {
  const exportLog = makeExportLog();
  const { kernelStorage, hostStorage } = initSwingStore(dbDir, {
    exportCallback: exportLog.callback,
  });
  const { transcriptStore } = kernelStorage;
  const { commit, close } = hostStorage;

  transcriptStore.initTranscript('st1');
  transcriptStore.initTranscript('st2');
  transcriptStore.addItem('st1', 'first');
  transcriptStore.addItem('st1', 'second');
  transcriptStore.rolloverSpan('st1');
  transcriptStore.addItem('st1', 'third');
  transcriptStore.addItem('st2', 'oneth');
  transcriptStore.addItem('st1', 'fourth');
  transcriptStore.addItem('st2', 'twoth');
  transcriptStore.addItem('st2', 'threeth');
  transcriptStore.addItem('st2', 'fourst');
  const reader1 = transcriptStore.readSpan('st1', 0);
  t.deepEqual(Array.from(reader1), ['first', 'second']);
  const reader2 = transcriptStore.readSpan('st2', 0);
  t.deepEqual(Array.from(reader2), ['oneth', 'twoth', 'threeth', 'fourst']);

  t.throws(() => transcriptStore.readSpan('st2', 3), {
    message: 'no transcript span for st2 at 3',
  });

  const reader1alt = transcriptStore.readSpan('st1');
  t.deepEqual(Array.from(reader1alt), ['third', 'fourth']);
  const reader1alt2 = transcriptStore.readSpan('st1', 2);
  t.deepEqual(Array.from(reader1alt2), ['third', 'fourth']);

  transcriptStore.initTranscript('empty');
  const readerEmpty = transcriptStore.readSpan('empty');
  t.deepEqual(Array.from(readerEmpty), []);

  t.throws(() => transcriptStore.readSpan('nonexistent'), {
    message: 'no current transcript for nonexistent',
  });

  await commit();
  t.deepEqual(exportLog.getLog(), [
    [
      [
        'export.transcript.st1.0',
        '{"vatID":"st1","startPos":0,"endPos":2,"hash":"157f906d6a601b2ca1834ae5e407dd89cf30b82359e7453fdcc6a2b9b49a1461","size":11}',
      ],
      [
        'export.transcript.st1.current',
        '{"vatID":"st1","startPos":2,"endPos":4,"hash":"c35e9841ec2d5e7cdef17f3b77a14f5562298790ec806e5dbf24bc673d7e9f09","size":11}',
      ],
      [
        'export.transcript.st2.current',
        '{"vatID":"st2","startPos":0,"endPos":4,"hash":"7f1d4eaf9c77b3ec282061e0814ba3f5142709eeab2ede4c375648a51a74644c","size":23}',
      ],
    ],
  ]);
  await close();
}

test('in-memory transcriptStore read/write', async t => {
  await testTranscriptStore(t, null);
});

test('persistent transcriptStore read/write', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isSwingStore(dbDir), false);
  await testTranscriptStore(t, dbDir);
});

test('transcriptStore abort', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const { kernelStorage, hostStorage } = initSwingStore(dbDir);
  const { transcriptStore } = kernelStorage;
  const { commit, close } = hostStorage;

  transcriptStore.initTranscript('st1');
  transcriptStore.addItem('st1', 'first');
  await commit(); // really write 'first'

  transcriptStore.initTranscript('st2');
  transcriptStore.addItem('st2', 'second');
  // abort is close without commit
  await close();

  const { transcriptStore: ss2 } = openSwingStore(dbDir).kernelStorage;
  const reader = ss2.readSpan('st1', 0);
  t.deepEqual(Array.from(reader), ['first']); // and not 'second'
});
