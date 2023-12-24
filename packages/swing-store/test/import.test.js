// @ts-check

import path from 'path';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

import sqlite3 from 'better-sqlite3';
import test from 'ava';
import { decodeBase64 } from '@endo/base64';

import { buffer } from '../src/util.js';
import { importSwingStore, makeSwingStoreExporter } from '../src/index.js';

import { tmpDir } from './util.js';
import {
  buildData,
  bundle0,
  bundle0ID,
  makeExporter,
  snapHash,
  snapshotData,
} from './exports.js';

const rank = {
  operational: 1,
  replay: 2,
  archival: 3,
  debug: 4,
};

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

test('import empty', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const exporter = makeExporter(new Map(), new Map());
  const ss = await importSwingStore(exporter, dbDir);
  t.teardown(ss.hostStorage.close);
  await ss.hostStorage.commit();
  const data = convert(ss.debug.dump());
  t.deepEqual(data, {
    kvEntries: {},
    transcripts: {},
    snapshots: {},
    bundles: {},
  });
});

const importTest = test.macro(async (t, mode) => {
  /** @typedef {import('../src/internal.js').ArtifactMode} ArtifactMode */
  const artifactMode = /** @type {ArtifactMode} */ (mode);

  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts, t0hash, t2hash, t5hash, t8hash } = buildData();

  const exporter = makeExporter(exportData, artifacts);

  // now import
  const ss = await importSwingStore(exporter, dbDir, { artifactMode });
  t.teardown(ss.hostStorage.close);
  await ss.hostStorage.commit();
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
  if (rank[artifactMode] >= rank.archival) {
    // only 'archival' and 'debug' get the old incarnation's span
    ts = ts.concat(['start-worker', 'shutdown-worker']); // 0,1
  }
  if (rank[artifactMode] >= rank.replay) {
    // those, or 'replay', get the current incarnation's old spans
    ts = ts.concat(['start-worker', 'delivery1', 'save-snapshot']); // 2,3,4
    ts = ts.concat(['load-snapshot', 'delivery2', 'save-snapshot']); // 5,6,7
  }
  ts = ts.concat(['load-snapshot', 'delivery3']); // 8,9

  let tsStart;
  if (artifactMode === 'archival' || artifactMode === 'debug') {
    tsStart = 0;
  } else if (artifactMode === 'replay') {
    tsStart = 2;
  } else {
    tsStart = 8;
  }

  const expectedTranscript = convertTranscript(ts, tsStart);
  t.deepEqual(data.transcripts, { v1: expectedTranscript });
  const uncompressedSnapshot = Buffer.from(snapshotData);
  const expectedSnapshots = [];
  if (artifactMode === 'debug') {
    expectedSnapshots.push({
      uncompressedSnapshot,
      hash: snapHash,
      inUse: 0,
      snapPos: 4,
    });
  }
  expectedSnapshots.push({
    uncompressedSnapshot,
    hash: snapHash,
    inUse: 1,
    snapPos: 7,
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
    [0, 2, 5, 8],
  );

  // and a new export should include all metadata, regardless of import mode

  const reExporter = makeSwingStoreExporter(dbDir);
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
  check('snapshot.v1.4', { vatID: 'v1', snapPos: 4, inUse: 0, hash: snapHash });
  check('snapshot.v1.7', { vatID: 'v1', snapPos: 7, inUse: 1, hash: snapHash });
  check('snapshot.v1.current', 'snapshot.v1.7');
  const base0 = { vatID: 'v1', incarnation: 0, isCurrent: 0 };
  const base1 = { vatID: 'v1', incarnation: 1, isCurrent: 0 };
  check('transcript.v1.0', { ...base0, startPos: 0, endPos: 2, hash: t0hash });
  check('transcript.v1.2', { ...base1, startPos: 2, endPos: 5, hash: t2hash });
  check('transcript.v1.5', { ...base1, startPos: 5, endPos: 8, hash: t5hash });
  check('transcript.v1.current', {
    ...base1,
    startPos: 8,
    endPos: 10,
    isCurrent: 1,
    hash: t8hash,
  });
  check(`bundle.${bundle0ID}`, bundle0ID);

  // the above list is supposed to be exhaustive
  if (reExportData.size) {
    console.log(reExportData);
    t.fail('unexpected exportData keys');
  }
});

test('import operational', importTest, 'operational');
test('import replay', importTest, 'replay');
test('import archival', importTest, 'archival');
test('import debug', importTest, 'debug');

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
