// @ts-check

import '@endo/init/debug.js';

import path from 'path';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

import sqlite3 from 'better-sqlite3';
import test from 'ava';
import { decodeBase64 } from '@endo/base64';

import { buffer } from '../src/util.js';
import { importSwingStore, makeSwingStoreExporter } from '../src/index.js';

import { tmpDir, makeB0ID } from './util.js';

const snapshotData = 'snapshot data';
// this snapHash was computed manually
const snapHash =
  'e7dee7266896538616b630a5da40a90e007726a383e005a9c9c5dd0c2daf9329';

/** @type {import('../src/bundleStore.js').Bundle} */
const bundle0 = { moduleFormat: 'nestedEvaluate', source: '1+1' };
const bundle0ID = makeB0ID(bundle0);

function convert(orig) {
  const bundles = Object.fromEntries(
    Object.entries(orig.bundles).map(([bundleID, encBundle]) => {
      const s = new TextDecoder().decode(decodeBase64(encBundle));
      assert(bundleID.startsWith('b0-'), bundleID);
      const bundle = JSON.parse(s);
      return [bundleID, bundle];
    }),
  );
  return { ...orig, bundles };
}

/**
 * @typedef { import('../src/exporter').KVPair } KVPair
 */

/**
 * @param { Map<string, string | null> } exportData
 * @param { Map<string, string> } artifacts
 */
function makeExporter(exportData, artifacts) {
  return {
    async *getExportData() {
      for (const [key, value] of exportData.entries()) {
        /** @type { KVPair } */
        const pair = [key, value];
        yield pair;
      }
    },
    async *getArtifactNames() {
      for (const name of artifacts.keys()) {
        yield name;
      }
    },
    async *getArtifact(name) {
      const data = artifacts.get(name);
      assert(data, `missing artifact ${name}`);
      yield Buffer.from(data);
    },
    // eslint-disable-next-line no-empty-function
    async close() {},
  };
}

test('import empty', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const exporter = makeExporter(new Map(), new Map());
  const ss = await importSwingStore(exporter, dbDir);
  ss.hostStorage.commit();
  const data = convert(ss.debug.dump());
  t.deepEqual(data, {
    kvEntries: {},
    transcripts: {},
    snapshots: {},
    bundles: {},
  });
});

function buildData() {
  // build an export manually
  const exportData = new Map();
  const artifacts = new Map();

  // shadow kvStore
  exportData.set('kv.key1', 'value1');

  // now add artifacts and metadata in pairs

  artifacts.set(`bundle.${bundle0ID}`, JSON.stringify(bundle0));
  exportData.set(`bundle.${bundle0ID}`, bundle0ID);

  const sbase = { vatID: 'v1', hash: snapHash, inUse: 0 };
  const tbase = { vatID: 'v1', startPos: 0, isCurrent: 0, incarnation: 0 };
  const addTS = (key, obj) =>
    exportData.set(key, JSON.stringify({ ...tbase, ...obj }));
  const t0hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  const t3hash =
    '1947001e78e01bd1e773feb22b4ffc530447373b9de9274d5d5fbda3f23dbf2b';
  const t6hash =
    'e6b42c6a3fb94285a93162f25a9fc0145fd4c5bb144917dc572c50ae2d02ee69';

  addTS(`transcript.v1.0`, { endPos: 3, hash: t0hash });
  artifacts.set(
    `transcript.v1.0.3`,
    'start-worker\ndelivery1\nsave-snapshot\n',
  );
  exportData.set(`snapshot.v1.2`, JSON.stringify({ ...sbase, snapPos: 2 }));
  artifacts.set(`snapshot.v1.2`, snapshotData);

  addTS(`transcript.v1.3`, { startPos: 3, endPos: 6, hash: t3hash });
  artifacts.set(
    'transcript.v1.3.6',
    'load-snapshot\ndelivery2\nsave-snapshot\n',
  );
  exportData.set(
    `snapshot.v1.5`,
    JSON.stringify({ ...sbase, snapPos: 5, inUse: 1 }),
  );
  artifacts.set(`snapshot.v1.5`, snapshotData);

  artifacts.set('transcript.v1.6.8', 'load-snapshot\ndelivery3\n');
  exportData.set(`snapshot.v1.current`, 'snapshot.v1.5');
  addTS(`transcript.v1.current`, {
    startPos: 6,
    endPos: 8,
    isCurrent: 1,
    hash: t6hash,
  });

  return { exportData, artifacts, t0hash, t3hash, t6hash };
}

const importTest = test.macro(async (t, mode) => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts, t0hash, t3hash, t6hash } = buildData();

  const exporter = makeExporter(exportData, artifacts);

  // now import
  const includeHistorical = mode === 'historical';
  const options = { includeHistorical };
  const ss = await importSwingStore(exporter, dbDir, options);
  ss.hostStorage.commit();
  const data = convert(ss.debug.dump());

  const convertTranscript = (items, startPos = 0) => {
    const out = {};
    let pos = startPos;
    for (const item of items) {
      out[pos] = item;
      pos += 1;
    }
    return out;
  };

  const convertSnapshots = async allVatSnapshots => {
    const out = {};
    for await (const [vatID, snapshots] of Object.entries(allVatSnapshots)) {
      const convertedSnapshots = [];
      for await (const snapshot of snapshots) {
        if (!snapshot.compressedSnapshot) {
          continue;
        }
        const gzReader = Readable.from(snapshot.compressedSnapshot);
        const unzipper = createGunzip();
        const snapshotReader = gzReader.pipe(unzipper);
        const uncompressedSnapshot = await buffer(snapshotReader);
        const converted = { ...snapshot, uncompressedSnapshot };
        delete converted.compressedSnapshot;
        convertedSnapshots.push(converted);
      }
      out[vatID] = convertedSnapshots;
    }
    return out;
  };

  t.deepEqual(data.kvEntries, { key1: 'value1' });
  let ts = [];
  let tsStart = 6; // start of current span
  if (mode === 'historical') {
    tsStart = 0; // historical means we get all spans
    ts = ts.concat(['start-worker', 'delivery1', 'save-snapshot']); // 0,1,2
    ts = ts.concat(['load-snapshot', 'delivery2', 'save-snapshot']); // 3,4,5
  }
  ts = ts.concat(['load-snapshot', 'delivery3']); // 6,7

  const expectedTranscript = convertTranscript(ts, tsStart);
  t.deepEqual(data.transcripts, { v1: expectedTranscript });
  const uncompressedSnapshot = Buffer.from(snapshotData);
  const expectedSnapshots = [];
  if (mode === 'historical') {
    expectedSnapshots.push({
      uncompressedSnapshot,
      hash: snapHash,
      inUse: 0,
      snapPos: 2,
    });
  }
  expectedSnapshots.push({
    uncompressedSnapshot,
    hash: snapHash,
    inUse: 1,
    snapPos: 5,
  });
  t.deepEqual(await convertSnapshots(data.snapshots), {
    v1: expectedSnapshots,
  });
  t.deepEqual(data.bundles, { [bundle0ID]: bundle0 });

  // look directly at the DB to confirm presence of metadata rows
  const db = sqlite3(path.join(dbDir, 'swingstore.sqlite'));
  const spanRows = [
    ...db.prepare('SELECT * FROM transcriptSpans ORDER BY startPos').iterate(),
  ];
  t.deepEqual(
    spanRows.map(sr => sr.startPos),
    [0, 3, 6],
  );

  // and a new export should include all metadata, regardless of import mode

  const reExporter = makeSwingStoreExporter(dbDir, 'current');
  const reExportData = new Map();
  for await (const [key, value] of reExporter.getExportData()) {
    reExportData.set(key, value);
  }
  // console.log(reExportData);

  const check = (key, expected) => {
    t.true(reExportData.has(key), `missing exportData ${key}`);
    let value = reExportData.get(key);
    reExportData.delete(key);
    if (typeof expected === 'object') {
      value = JSON.parse(value);
    }
    t.deepEqual(value, expected);
  };

  check('kv.key1', 'value1');
  check('snapshot.v1.2', { vatID: 'v1', snapPos: 2, inUse: 0, hash: snapHash });
  check('snapshot.v1.5', { vatID: 'v1', snapPos: 5, inUse: 1, hash: snapHash });
  check('snapshot.v1.current', 'snapshot.v1.5');
  const base = { vatID: 'v1', incarnation: 0, isCurrent: 0 };
  check('transcript.v1.0', { ...base, startPos: 0, endPos: 3, hash: t0hash });
  check('transcript.v1.3', { ...base, startPos: 3, endPos: 6, hash: t3hash });
  check('transcript.v1.current', {
    ...base,
    startPos: 6,
    endPos: 8,
    isCurrent: 1,
    hash: t6hash,
  });
  check(`bundle.${bundle0ID}`, bundle0ID);

  // the above list is supposed to be exhaustive
  if (reExportData.size) {
    console.log(reExportData);
    t.fail('unexpected exportData keys');
  }
});

test('import current', importTest, 'current');
test('import historical', importTest, 'historical');

test('import is missing bundle', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  exportData.set(`bundle.${bundle0ID}`, bundle0ID);
  // but there is no artifact to match
  const exporter = makeExporter(exportData, new Map());
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /missing bundles for:/,
  });
});

test('import is missing snapshot', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  exportData.set(
    `snapshot.v1.2`,
    JSON.stringify({ vatID: 'v1', hash: snapHash, inUse: 1, snapPos: 2 }),
  );
  // but there is no artifact to match
  const exporter = makeExporter(exportData, new Map());
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /current snapshots are pruned for vats/,
  });
});

test('import is missing transcript span', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const t0hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  exportData.set(
    `transcript.v1.current`,
    JSON.stringify({
      vatID: 'v1',
      startPos: 0,
      endPos: 3,
      hash: t0hash,
      isCurrent: 1,
      incarnation: 0,
    }),
  );
  // but there is no artifact to match
  const exporter = makeExporter(exportData, new Map());
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /incomplete current transcript/,
  });
});

test('import has mismatched transcript span', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const t0hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  exportData.set(
    `transcript.v1.current`,
    JSON.stringify({
      vatID: 'v1',
      startPos: 0,
      endPos: 3,
      hash: t0hash,
      isCurrent: 0, // mismatch
      incarnation: 0,
    }),
  );
  const exporter = makeExporter(exportData, new Map());
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /transcript key "transcript.v1.current" mismatches metadata/,
  });
});

test('import has incomplete transcript span', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const artifacts = new Map();
  const t0hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  exportData.set(
    `transcript.v1.current`,
    JSON.stringify({
      vatID: 'v1',
      startPos: 0,
      endPos: 4, // expect 4 items
      hash: t0hash,
      isCurrent: 1,
      incarnation: 0,
    }),
  );
  // but artifact only contains 3
  artifacts.set(
    `transcript.v1.0.4`,
    'start-worker\ndelivery1\nsave-snapshot\n',
  );

  const exporter = makeExporter(exportData, artifacts);
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /artifact "transcript.v1.0.4" is not complete/,
  });
});

test('import has corrupt transcript span', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const artifacts = new Map();
  const t0hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  exportData.set(
    `transcript.v1.current`,
    JSON.stringify({
      vatID: 'v1',
      startPos: 0,
      endPos: 3,
      hash: t0hash,
      isCurrent: 1,
      incarnation: 0,
    }),
  );
  artifacts.set(
    `transcript.v1.0.3`,
    'start-worker\nBAD-DELIVERY1\nsave-snapshot\n',
  );

  const exporter = makeExporter(exportData, artifacts);
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /artifact "transcript.v1.0.3" hash is.*metadata says/,
  });
});

test('import has corrupt snapshot', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const artifacts = new Map();
  exportData.set(
    `snapshot.v1.2`,
    JSON.stringify({
      vatID: 'v1',
      snapPos: 2,
      hash: snapHash,
      inUse: 1,
    }),
  );
  artifacts.set('snapshot.v1.2', `${snapshotData}WRONG`);

  const exporter = makeExporter(exportData, artifacts);
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /snapshot "snapshot.v1.2" hash is.*metadata says/,
  });
});

test('import has corrupt bundle', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  const artifacts = new Map();
  exportData.set(`bundle.${bundle0ID}`, bundle0ID);
  const badBundle = { ...bundle0, source: 'WRONG' };
  artifacts.set(`bundle.${bundle0ID}`, JSON.stringify(badBundle));

  const exporter = makeExporter(exportData, artifacts);
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /bundleID ".*" does not match bundle artifact/,
  });
});

test('import has unknown metadata tag', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const exportData = new Map();
  exportData.set(`unknown.v1.current`, 'value');
  const exporter = makeExporter(exportData, new Map());
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /unknown export-data type "unknown" on import/,
  });
});

test('import has unknown artifact tag', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const artifacts = new Map();
  artifacts.set('unknown.v1.current', 'value');
  const exporter = makeExporter(new Map(), artifacts);
  await t.throwsAsync(async () => importSwingStore(exporter, dbDir), {
    message: /unknown artifact type "unknown" on import/,
  });
});
