// @ts-check

import '@endo/init/debug.js';
import fs from 'fs';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';

import {
  initSwingStore,
  makeSwingStoreExporter,
  importSwingStore,
} from '../src/swingStore.js';

function makeExportLog() {
  const exportLog = [];
  const shadowStore = new Map();
  return {
    callback(updates) {
      exportLog.push(updates);
      for (const [key, value] of updates) {
        if (value == null) {
          shadowStore.delete(key);
        } else {
          shadowStore.set(key, value);
        }
      }
    },
    getLog() {
      return exportLog;
    },
    entries() {
      return shadowStore.entries();
    },
  };
}

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

function actLikeAVatRunningACrank(vat, ks, crank, doFail) {
  const { kvStore, transcriptStore } = ks;
  const { vatID } = vat;
  ks.startCrank();
  if (doFail) {
    ks.establishCrankSavepoint('a');
  }
  kvStore.set('kval', `set in ${crank}`);
  kvStore.set(`${vatID}.vval`, `stuff in ${crank}`);
  kvStore.set(`${vatID}.monotonic.${crank}`, 'more and more');
  if (crank % 3 === 0) {
    kvStore.delete('brigadoon');
  } else {
    kvStore.set('brigadoon', `here during ${crank}`);
  }
  transcriptStore.addItem(vatID, `stuff done during crank #${crank}`);
  if (doFail) {
    ks.rollbackCrank('a');
  } else {
    vat.endPos += 1;
  }
  ks.endCrank();
}

async function fakeAVatSnapshot(vat, ks) {
  await ks.snapStore.saveSnapshot(vat.vatID, vat.endPos, async filePath => {
    fs.writeFileSync(
      filePath,
      `snapshot of vat ${vat.vatID} as of ${vat.endPos}`,
    );
  });
  ks.transcriptStore.rolloverSpan(vat.vatID);
}

const compareElems = (a, b) => a[0].localeCompare(b[0]);

test('crank abort leaves no debris in export log', async t => {
  const exportLog = makeExportLog();
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const ssOut = initSwingStore(dbDir, {
    exportCallback: exportLog.callback,
  });
  const { kernelStorage } = ssOut;

  const vat = { vatID: 'vatA', endPos: 0 };
  kernelStorage.transcriptStore.initTranscript(vat.vatID);

  // Run 4 "blocks", each consisting of 4 "cranks", accumulating stuff,
  // aborting every third crank.
  let crankNum = 0;
  for (let block = 0; block < 4; block += 1) {
    for (let crank = 0; crank < 4; crank += 1) {
      crankNum += 1;
      actLikeAVatRunningACrank(
        vat,
        kernelStorage,
        crankNum,
        crankNum % 3 === 0,
      );
    }
    // eslint-disable-next-line no-await-in-loop
    await ssOut.hostStorage.commit();
  }

  const exporter = makeSwingStoreExporter(dbDir, 'current');

  const exportData = [];
  for await (const elem of exporter.getExportData()) {
    exportData.push(elem);
  }
  exportData.sort(compareElems);

  const feedData = [];
  for (const elem of exportLog.entries()) {
    feedData.push(elem);
  }
  feedData.sort(compareElems);

  t.deepEqual(exportData, feedData);
  // Commented data entries would have been produced by the aborted cranks
  t.deepEqual(exportData, [
    ['kv.brigadoon', 'here during 16'],
    ['kv.kval', 'set in 16'],
    ['kv.vatA.monotonic.1', 'more and more'],
    ['kv.vatA.monotonic.10', 'more and more'],
    ['kv.vatA.monotonic.11', 'more and more'],
    // ['kv.vatA.monotonic.12', 'more and more'],
    ['kv.vatA.monotonic.13', 'more and more'],
    ['kv.vatA.monotonic.14', 'more and more'],
    // ['kv.vatA.monotonic.15', 'more and more'],
    ['kv.vatA.monotonic.16', 'more and more'],
    ['kv.vatA.monotonic.2', 'more and more'],
    // ['kv.vatA.monotonic.3', 'more and more'],
    ['kv.vatA.monotonic.4', 'more and more'],
    ['kv.vatA.monotonic.5', 'more and more'],
    // ['kv.vatA.monotonic.6', 'more and more'],
    ['kv.vatA.monotonic.7', 'more and more'],
    ['kv.vatA.monotonic.8', 'more and more'],
    // ['kv.vatA.monotonic.9', 'more and more'],
    ['kv.vatA.vval', 'stuff in 16'],
    [
      'transcript.vatA.current',
      // '{"vatID":"vatA","startPos":0,"endPos":16,"hash":"83e7ed8d3ee339a8b0989512973396d3e9db4b4c3d76570862d99e3cdebaf8c6","isCurrent":1}',
      '{"vatID":"vatA","startPos":0,"endPos":11,"hash":"ff988824e0fb02bfd0a5ecf466513fd4ef2ac6e488ab9070e640683faa8ddb11","isCurrent":1}',
    ],
  ]);
});

async function testExportImport(
  t,
  runMode,
  exportMode,
  importMode,
  failureMode,
  expectedArtifactNames,
) {
  const exportLog = makeExportLog();
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const keepTranscripts = runMode !== 'current';
  const keepSnapshots = runMode === 'debug';
  const ssOut = initSwingStore(dbDir, {
    exportCallback: exportLog.callback,
    keepSnapshots,
    keepTranscripts,
  });
  const { kernelStorage, debug } = ssOut;

  const vats = [
    { vatID: 'vatA', endPos: 0 },
    { vatID: 'vatB', endPos: 0 },
  ];
  for (const vat of vats) {
    kernelStorage.transcriptStore.initTranscript(vat.vatID);
  }

  // Run 4 "blocks", each consisting of 4 "cranks", across 2 "vats"
  // Snapshot 'vatA' after the first and third blocks and 'vatB' after the second
  // This will leave 2 current snapshots and 1 historical snapshot
  let crankNum = 0;
  for (let block = 0; block < 4; block += 1) {
    for (let crank = 0; crank < 4; crank += 1) {
      crankNum += 1;
      const vat = vats[crankNum % vats.length];
      actLikeAVatRunningACrank(vat, kernelStorage, crankNum);
    }
    if (block < 3) {
      // eslint-disable-next-line no-await-in-loop
      await fakeAVatSnapshot(vats[block % 2], kernelStorage);
    }
    // eslint-disable-next-line no-await-in-loop
    await ssOut.hostStorage.commit();
  }

  const exporter = makeSwingStoreExporter(dbDir, exportMode);

  const exportData = [];
  for await (const elem of exporter.getExportData()) {
    exportData.push(elem);
  }
  exportData.sort(compareElems);

  const feedData = [];
  for (const elem of exportLog.entries()) {
    feedData.push(elem);
  }
  feedData.sort(compareElems);

  t.deepEqual(exportData, feedData);
  t.deepEqual(exportData, [
    ['kv.brigadoon', 'here during 16'],
    ['kv.kval', 'set in 16'],
    ['kv.vatA.monotonic.10', 'more and more'],
    ['kv.vatA.monotonic.12', 'more and more'],
    ['kv.vatA.monotonic.14', 'more and more'],
    ['kv.vatA.monotonic.16', 'more and more'],
    ['kv.vatA.monotonic.2', 'more and more'],
    ['kv.vatA.monotonic.4', 'more and more'],
    ['kv.vatA.monotonic.6', 'more and more'],
    ['kv.vatA.monotonic.8', 'more and more'],
    ['kv.vatA.vval', 'stuff in 16'],
    ['kv.vatB.monotonic.1', 'more and more'],
    ['kv.vatB.monotonic.11', 'more and more'],
    ['kv.vatB.monotonic.13', 'more and more'],
    ['kv.vatB.monotonic.15', 'more and more'],
    ['kv.vatB.monotonic.3', 'more and more'],
    ['kv.vatB.monotonic.5', 'more and more'],
    ['kv.vatB.monotonic.7', 'more and more'],
    ['kv.vatB.monotonic.9', 'more and more'],
    ['kv.vatB.vval', 'stuff in 15'],
    [
      'snapshot.vatA.2',
      '{"vatID":"vatA","endPos":2,"hash":"6c7e452ee3eaec849c93234d933af4300012e4ff161c328d3c088ec3deef76a6","inUse":0}',
    ],
    [
      'snapshot.vatA.6',
      '{"vatID":"vatA","endPos":6,"hash":"36afc9e2717c395759e308c4a877d491f967e9768d73520bde758ff4fac5d8b9","inUse":1}',
    ],
    ['snapshot.vatA.current', 'snapshot.vatA.6'],
    [
      'snapshot.vatB.4',
      '{"vatID":"vatB","endPos":4,"hash":"afd477014db678fbc1aa58beab50f444deb653b8cc8e8583214a363fd12ed57a","inUse":1}',
    ],
    ['snapshot.vatB.current', 'snapshot.vatB.4'],
    [
      'transcript.vatA.0',
      '{"vatID":"vatA","startPos":0,"endPos":2,"hash":"ea8ac1a751712ad66e4a9182adc65afe9bb0f4cd0ee0b828c895c63fbd2e3157","isCurrent":0}',
    ],
    [
      'transcript.vatA.2',
      '{"vatID":"vatA","startPos":2,"endPos":6,"hash":"88f299ca67b8acdf6023a83bb8e899af5adcf3271c7a1a2a495dcd6f1fbaac9f","isCurrent":0}',
    ],
    [
      'transcript.vatA.current',
      '{"vatID":"vatA","startPos":6,"endPos":8,"hash":"fe5d692b24a32d53bf617ba9ed3391b60c36a402c70a07a6aa984fc316e4efcc","isCurrent":1}',
    ],
    [
      'transcript.vatB.0',
      '{"vatID":"vatB","startPos":0,"endPos":4,"hash":"41dbf60cdec066106c7030517cb9f9f34a50fe2259705cf5fdbdd0b39ae12e46","isCurrent":0}',
    ],
    [
      'transcript.vatB.current',
      '{"vatID":"vatB","startPos":4,"endPos":8,"hash":"34fa09207bfb7af5fc3e65acb07f13b60834d0fbd2c6b9708f794c4397bd865d","isCurrent":1}',
    ],
  ]);

  const artifactNames = [];
  for await (const name of exporter.getArtifactNames()) {
    artifactNames.push(name);
  }
  t.deepEqual(artifactNames, expectedArtifactNames);

  const includeHistorical = importMode !== 'current';

  const beforeDump = debug.dump(keepSnapshots);
  let ssIn;
  try {
    ssIn = await importSwingStore(exporter, null, {
      includeHistorical,
    });
  } catch (e) {
    if (failureMode === 'transcript') {
      t.is(e.message, 'artifact "transcript.vatA.0.2" is not available');
      return;
    } else if (failureMode === 'snapshot') {
      t.is(e.message, 'artifact "snapshot.vatA.2" is not available');
      return;
    }
    throw e;
  }
  t.is(failureMode, 'none');
  await ssIn.hostStorage.commit();
  const dumpsShouldMatch =
    runMode !== 'debug' || (exportMode === 'debug' && importMode !== 'current');
  if (dumpsShouldMatch) {
    const afterDump = ssIn.debug.dump(keepSnapshots);
    t.deepEqual(beforeDump, afterDump);
  }

  exporter.close();
}

const expectedCurrentArtifacts = [
  'snapshot.vatA.6',
  'snapshot.vatB.4',
  'transcript.vatA.6.8',
  'transcript.vatB.4.8',
];

const expectedArchivalArtifacts = [
  'snapshot.vatA.6',
  'snapshot.vatB.4',
  'transcript.vatA.0.2',
  'transcript.vatA.2.6',
  'transcript.vatA.6.8',
  'transcript.vatB.0.4',
  'transcript.vatB.4.8',
];

const expectedDebugArtifacts = [
  'snapshot.vatA.6',
  'snapshot.vatB.4',
  'snapshot.vatA.2',
  'transcript.vatA.0.2',
  'transcript.vatA.2.6',
  'transcript.vatA.6.8',
  'transcript.vatB.0.4',
  'transcript.vatB.4.8',
];

const C = 'current';
const A = 'archival';
const D = 'debug';

test('export and import data for state sync - current->current->current', async t => {
  await testExportImport(t, C, C, C, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - current->current->archival', async t => {
  await testExportImport(t, C, C, A, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - current->current->debug', async t => {
  await testExportImport(t, C, C, D, 'none', expectedCurrentArtifacts);
});

test('export and import data for state sync - current->archival->current', async t => {
  await testExportImport(t, C, A, C, 'none', expectedArchivalArtifacts);
});
test('export and import data for state sync - current->archival->archival', async t => {
  await testExportImport(t, C, A, A, 'transcript', expectedArchivalArtifacts);
});
test('export and import data for state sync - current->archival->debug', async t => {
  await testExportImport(t, C, A, D, 'transcript', expectedArchivalArtifacts);
});

test('export and import data for state sync - current->debug->current', async t => {
  await testExportImport(t, C, D, C, 'none', expectedDebugArtifacts);
});
test('export and import data for state sync - current->debug->archival', async t => {
  await testExportImport(t, C, D, A, 'snapshot', expectedDebugArtifacts);
});
test('export and import data for state sync - current->debug->debug', async t => {
  await testExportImport(t, C, D, D, 'snapshot', expectedDebugArtifacts);
});

// ------------------------------------------------------------

test('export and import data for state sync - archival->current->current', async t => {
  await testExportImport(t, A, C, C, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - archival->current->archival', async t => {
  await testExportImport(t, A, C, A, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - archival->current->debug', async t => {
  await testExportImport(t, A, C, D, 'none', expectedCurrentArtifacts);
});

test('export and import data for state sync - archival->archival->current', async t => {
  await testExportImport(t, A, A, C, 'none', expectedArchivalArtifacts);
});
test('export and import data for state sync - archival->archival->archival', async t => {
  await testExportImport(t, A, A, A, 'none', expectedArchivalArtifacts);
});
test('export and import data for state sync - archival->archival->debug', async t => {
  await testExportImport(t, A, A, D, 'none', expectedArchivalArtifacts);
});

test('export and import data for state sync - archival->debug->current', async t => {
  await testExportImport(t, A, D, C, 'none', expectedDebugArtifacts);
});
test('export and import data for state sync - archival->debug->archival', async t => {
  await testExportImport(t, A, D, A, 'snapshot', expectedDebugArtifacts);
});
test('export and import data for state sync - archival->debug->debug', async t => {
  await testExportImport(t, A, D, D, 'snapshot', expectedDebugArtifacts);
});

// ------------------------------------------------------------

test('export and import data for state sync - debug->current->current', async t => {
  await testExportImport(t, D, C, C, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - debug->current->archival', async t => {
  await testExportImport(t, D, C, A, 'none', expectedCurrentArtifacts);
});
test('export and import data for state sync - debug->current->debug', async t => {
  await testExportImport(t, D, C, D, 'none', expectedCurrentArtifacts);
});

test('export and import data for state sync - debug->archival->current', async t => {
  await testExportImport(t, D, A, C, 'none', expectedArchivalArtifacts);
});
test('export and import data for state sync - debug->archival->archival', async t => {
  await testExportImport(t, D, A, A, 'none', expectedArchivalArtifacts);
});
test('export and import data for state sync - debug->archival->debug', async t => {
  await testExportImport(t, D, A, D, 'none', expectedArchivalArtifacts);
});

test('export and import data for state sync - debug->debug->current', async t => {
  await testExportImport(t, D, D, C, 'none', expectedDebugArtifacts);
});
test('export and import data for state sync - debug->debug->archival', async t => {
  await testExportImport(t, D, D, A, 'none', expectedDebugArtifacts);
});
test('export and import data for state sync - debug->debug->debug', async t => {
  await testExportImport(t, D, D, D, 'none', expectedDebugArtifacts);
});
