// @ts-check

import '@endo/init/debug.js';
import fs from 'fs';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import bundleSource from '@endo/bundle-source';

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

async function embundle(filename) {
  const bundleFile = new URL(filename, import.meta.url).pathname;
  const bundle = await bundleSource(bundleFile);
  const bundleID = `b1-${bundle.endoZipBase64Sha512}`;
  return [bundleID, bundle];
}

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
  ks.transcriptStore.addItem(vat.vatID, 'save-snapshot');
  vat.endPos += 1;
  ks.transcriptStore.rolloverSpan(vat.vatID);
  ks.transcriptStore.addItem(vat.vatID, 'load-snapshot');
  vat.endPos += 1;
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
      '{"vatID":"vatA","startPos":0,"endPos":11,"hash":"ff988824e0fb02bfd0a5ecf466513fd4ef2ac6e488ab9070e640683faa8ddb11","isCurrent":1,"incarnation":0}',
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

  const [bundleID1, bundle1] = await embundle('./faux-module.js');
  const [bundleID2, bundle2] = await embundle('./bohr-module.js');

  kernelStorage.bundleStore.addBundle(bundleID1, bundle1);
  kernelStorage.bundleStore.addBundle(bundleID2, bundle2);

  const [bundleIDA, bundleIDB] = [bundleID1, bundleID2].sort();

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
    [`bundle.${bundleIDA}`, `${bundleIDA}`],
    [`bundle.${bundleIDB}`, `${bundleIDB}`],
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
      'snapshot.vatA.8',
      '{"vatID":"vatA","endPos":8,"hash":"f010b0f3e7d48e378cc59b678388d2aae6667c4ff233454a6d8f08caebfda681","inUse":1}',
    ],
    ['snapshot.vatA.current', 'snapshot.vatA.8'],
    [
      'snapshot.vatB.4',
      '{"vatID":"vatB","endPos":4,"hash":"afd477014db678fbc1aa58beab50f444deb653b8cc8e8583214a363fd12ed57a","inUse":1}',
    ],
    ['snapshot.vatB.current', 'snapshot.vatB.4'],
    [
      'transcript.vatA.0',
      '{"vatID":"vatA","startPos":0,"endPos":3,"hash":"86a0ba16ef38704dea3d04f8d8e4b104f162e6396249bf153f3808b0f9c0e36e","isCurrent":0,"incarnation":0}',
    ],
    [
      'transcript.vatA.3',
      '{"vatID":"vatA","startPos":3,"endPos":9,"hash":"e71df351455b00971357c15d86e35556d7ee77a8a13149bd06bff80822238daa","isCurrent":0,"incarnation":0}',
    ],
    [
      'transcript.vatA.current',
      '{"vatID":"vatA","startPos":9,"endPos":12,"hash":"17ef3fbe1a34ba8c8145fe21c16bee5ef6ec7b9132b740cc848849b67f449320","isCurrent":1,"incarnation":0}',
    ],
    [
      'transcript.vatB.0',
      '{"vatID":"vatB","startPos":0,"endPos":5,"hash":"0de691725ef5d53c8016f6a064e1106c25e29f659d13bb8a72fcc21a5d1cd67c","isCurrent":0,"incarnation":0}',
    ],
    [
      'transcript.vatB.current',
      '{"vatID":"vatB","startPos":5,"endPos":10,"hash":"69f5d2db6891b35fb992b9c42fc39db15f1bb8066fada3d697826e703fad994b","isCurrent":1,"incarnation":0}',
    ],
  ]);

  expectedArtifactNames = Array.from(expectedArtifactNames);
  expectedArtifactNames.push(`bundle.${bundleIDA}`);
  expectedArtifactNames.push(`bundle.${bundleIDB}`);

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
      t.is(e.message, 'artifact "transcript.vatA.0.3" is not available');
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
}

const expectedCurrentArtifacts = [
  'snapshot.vatA.8',
  'snapshot.vatB.4',
  'transcript.vatA.9.12',
  'transcript.vatB.5.10',
];

const expectedArchivalArtifacts = [
  'snapshot.vatA.8',
  'snapshot.vatB.4',
  'transcript.vatA.0.3',
  'transcript.vatA.3.9',
  'transcript.vatA.9.12',
  'transcript.vatB.0.5',
  'transcript.vatB.5.10',
];

const expectedDebugArtifacts = [
  'snapshot.vatA.8',
  'snapshot.vatB.4',
  'snapshot.vatA.2',
  'transcript.vatA.0.3',
  'transcript.vatA.3.9',
  'transcript.vatA.9.12',
  'transcript.vatB.0.5',
  'transcript.vatB.5.10',
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
