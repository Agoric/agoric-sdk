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
  for await (const elem of exporter.getExportData()) {
    kvData.push(elem);
  }
  t.deepEqual(kvData, [
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
      'snapshot.vatA.6',
      '{"vatID":"vatA","endPos":6,"hash":"36afc9e2717c395759e308c4a877d491f967e9768d73520bde758ff4fac5d8b9"}',
    ],
    ['snapshot.vatA.current', 'snapshot.vatA.6'],
    [
      'snapshot.vatB.4',
      '{"vatID":"vatB","endPos":4,"hash":"afd477014db678fbc1aa58beab50f444deb653b8cc8e8583214a363fd12ed57a"}',
    ],
    ['snapshot.vatB.current', 'snapshot.vatB.4'],
    [
      'snapshot.vatA.2',
      '{"vatID":"vatA","endPos":2,"hash":"6c7e452ee3eaec849c93234d933af4300012e4ff161c328d3c088ec3deef76a6"}',
    ],
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
