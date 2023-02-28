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
        if (value === null) {
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

function actLikeAVatRunningACrank(vat, ks, crank) {
  const { kvStore, transcriptStore } = ks;
  const { vatID } = vat;
  ks.startCrank();
  kvStore.set('kval', `set in ${crank}`);
  kvStore.set(`${vatID}.vval`, `stuff in ${crank}`);
  kvStore.set(`${vatID}.monotonic.${crank}`, 'more and more');
  if (crank % 3 === 0) {
    kvStore.delete('brigadoon');
  } else {
    kvStore.set('brigadoon', `here during ${crank}`);
  }
  ks.endCrank();
  transcriptStore.addItem(vatID, `stuff done during crank #${crank}`);
  vat.endPos += 1;
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

test('export and import data for state sync', async t => {
  const exportLog = makeExportLog();
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const ssOut = initSwingStore(dbDir, {
    exportCallback: exportLog.callback,
    keepSnapshots: true,
  });
  const { kernelStorage, debug } = ssOut;

  const vats = [
    { vatID: 'vatA', endPos: 0 },
    { vatID: 'vatB', endPos: 0 },
  ];
  for (const vat of vats) {
    kernelStorage.transcriptStore.initTranscript(vat.vatID);
  }

  // Run 4 "blocks", each consisting of 5 "cranks", across 2 "vats"
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
    ssOut.hostStorage.commit();
  }

  const exporter = makeSwingStoreExporter(dbDir);

  const kvData = [];
  for await (const elem of exporter.getKVData()) {
    kvData.push(elem);
  }
  t.deepEqual(kvData, [
    ['brigadoon', 'here during 16'],
    ['kval', 'set in 16'],
    ['vatA.monotonic.10', 'more and more'],
    ['vatA.monotonic.12', 'more and more'],
    ['vatA.monotonic.14', 'more and more'],
    ['vatA.monotonic.16', 'more and more'],
    ['vatA.monotonic.2', 'more and more'],
    ['vatA.monotonic.4', 'more and more'],
    ['vatA.monotonic.6', 'more and more'],
    ['vatA.monotonic.8', 'more and more'],
    ['vatA.vval', 'stuff in 16'],
    ['vatB.monotonic.1', 'more and more'],
    ['vatB.monotonic.11', 'more and more'],
    ['vatB.monotonic.13', 'more and more'],
    ['vatB.monotonic.15', 'more and more'],
    ['vatB.monotonic.3', 'more and more'],
    ['vatB.monotonic.5', 'more and more'],
    ['vatB.monotonic.7', 'more and more'],
    ['vatB.monotonic.9', 'more and more'],
    ['vatB.vval', 'stuff in 15'],
    [
      'export.snapshot.vatA.6',
      '{"vatID":"vatA","endPos":6,"hash":"36afc9e2717c395759e308c4a877d491f967e9768d73520bde758ff4fac5d8b9"}',
    ],
    ['export.snapshot.vatA.current', 'snapshot.vatA.6'],
    [
      'export.snapshot.vatB.4',
      '{"vatID":"vatB","endPos":4,"hash":"afd477014db678fbc1aa58beab50f444deb653b8cc8e8583214a363fd12ed57a"}',
    ],
    ['export.snapshot.vatB.current', 'snapshot.vatB.4'],
    [
      'export.snapshot.vatA.2',
      '{"vatID":"vatA","endPos":2,"hash":"6c7e452ee3eaec849c93234d933af4300012e4ff161c328d3c088ec3deef76a6"}',
    ],
    [
      'export.transcript.vatA.0',
      '{"vatID":"vatA","startPos":0,"endPos":2,"hash":"404df94aaedd44be0dd6cb5f3c360253926058d482e1160c67e826b4001bdfbe","current":0}',
    ],
    [
      'export.transcript.vatA.2',
      '{"vatID":"vatA","startPos":2,"endPos":6,"hash":"fea97db13d8feaa33322aaaec6b9edae7d9d45d2dd5b90dfa24c9edc4e8f3dfa","current":0}',
    ],
    [
      'export.transcript.vatA.current',
      '{"vatID":"vatA","startPos":6,"endPos":8,"hash":"84c2705fa00da1f9f7c02d7d6ca2b263099b8ee681840f7df781da644ee4cbdd","current":1}',
    ],
    [
      'export.transcript.vatB.0',
      '{"vatID":"vatB","startPos":0,"endPos":4,"hash":"9925c1f23e5176e115b524621ca9bd77a1122de654be1332bfd04f17c33c9827","current":0}',
    ],
    [
      'export.transcript.vatB.current',
      '{"vatID":"vatB","startPos":4,"endPos":8,"hash":"f3afdb75964f1d4cff4828458c31f722463d8918d6b59c36d0e6263b48c5e6d4","current":1}',
    ],
  ]);

  const artifactNamesAll = [];
  for await (const name of exporter.getArtifactNames(true)) {
    artifactNamesAll.push(name);
  }
  t.deepEqual(artifactNamesAll, [
    'snapshot.vatA.6',
    'snapshot.vatB.4',
    'snapshot.vatA.2',
    'transcript.vatA.0.2',
    'transcript.vatA.2.6',
    'transcript.vatA.6.8',
    'transcript.vatB.0.4',
    'transcript.vatB.4.8',
  ]);

  const artifactNamesCurr = [];
  for await (const name of exporter.getArtifactNames(false)) {
    artifactNamesCurr.push(name);
  }
  t.deepEqual(artifactNamesCurr, [
    'snapshot.vatA.6',
    'snapshot.vatB.4',
    'transcript.vatA.6.8',
    'transcript.vatB.4.8',
  ]);

  const beforeDumpFull = debug.dump(true);
  const ssInFull = await importSwingStore(exporter, null, {
    includeHistorical: true,
  });
  ssInFull.hostStorage.commit();
  const afterDumpFull = ssInFull.debug.dump(true);
  t.deepEqual(beforeDumpFull, afterDumpFull);

  const beforeDumpCurr = debug.dump(false);
  const ssInCurr = await importSwingStore(exporter, null, {
    includeHistorical: false,
  });
  ssInCurr.hostStorage.commit();
  const afterDumpCurr = ssInCurr.debug.dump(false);
  t.deepEqual(beforeDumpCurr, afterDumpCurr);
});
