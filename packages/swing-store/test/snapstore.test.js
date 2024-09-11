// @ts-check
import test from 'ava';

import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sqlite3 from 'better-sqlite3';
import tmp from 'tmp';

import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '../src/snapStore.js';
import { makeArchiveSnapshot } from '../src/archiver.js';
import { tmpDir } from './util.js';

function makeExportLog() {
  const exportLog = [];
  return {
    noteExport(key, value) {
      exportLog.push([key, value]);
    },
    getLog() {
      return exportLog;
    },
  };
}

function ensureTxn() {}

/** @param {string} payload */
async function* getSnapshotStream(payload) {
  yield Buffer.from(payload);
}
harden(getSnapshotStream);

test('compress to cache file; closes snapshot stream', async t => {
  const db = sqlite3(':memory:');
  const exportLog = makeExportLog();
  const [archiveDir, cleanupArchives] = await tmpDir('archives');
  t.teardown(cleanupArchives);
  const fsPowers = { fs, path, tmp };
  const archiveSnapshot = makeArchiveSnapshot(archiveDir, fsPowers);
  const store = makeSnapStore(
    db,
    ensureTxn,
    {
      measureSeconds: makeMeasureSeconds(() => 0),
    },
    exportLog.noteExport,
    { archiveSnapshot },
  );

  const snapshotStream = getSnapshotStream('abc');
  const result = await store.saveSnapshot('fakeVatID', 47, snapshotStream);
  const { hash } = result;
  const expectedHash =
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  t.deepEqual(result, {
    hash: expectedHash,
    uncompressedSize: 3,
    compressedSize: 23,
    dbSaveSeconds: 0,
    archiveWriteSeconds: 0,
    compressSeconds: 0,
  });
  const snapshotInfo = store.getSnapshotInfo('fakeVatID');
  const dbInfo = {
    snapPos: 47,
    hash: expectedHash,
    uncompressedSize: 3,
    compressedSize: 23,
  };
  const exportInfo = {
    snapPos: 47,
    hash: expectedHash,
    inUse: 1,
  };
  t.deepEqual(snapshotInfo, dbInfo);
  t.is(store.hasHash('fakeVatID', hash), true);
  const zero =
    '0000000000000000000000000000000000000000000000000000000000000000';
  t.is(store.hasHash('fakeVatID', zero), false);
  t.is(store.hasHash('nonexistentVatID', hash), false);
  const nextResult = await snapshotStream.next();
  t.true(nextResult.done, 'snapshot content should have been fully consumed');

  const sqlGetSnapshot = db.prepare(`
    SELECT compressedSnapshot
    FROM snapshots
    WHERE hash = ?
  `);
  sqlGetSnapshot.pluck(true);
  const snapshotGZ = sqlGetSnapshot.get(hash);
  t.truthy(snapshotGZ);
  // @ts-expect-error unknown
  const contents = zlib.gunzipSync(snapshotGZ);
  t.is(contents.toString(), 'abc', 'gunzip(contents) matches original');
  const logInfo = { vatID: 'fakeVatID', ...exportInfo };
  t.deepEqual(exportLog.getLog(), [
    ['snapshot.fakeVatID.47', JSON.stringify(logInfo)],
    ['snapshot.fakeVatID.current', `snapshot.fakeVatID.47`],
  ]);

  // verify disk archive
  t.deepEqual(
    fs.readdirSync(archiveDir),
    ['snapshot.fakeVatID.47.gz'],
    'archive must be written to disk',
  );
  const fileContents = fs.readFileSync(
    path.join(archiveDir, 'snapshot.fakeVatID.47.gz'),
  );
  t.is(
    fileContents.length,
    dbInfo.compressedSize,
    'file size must match database compressedSize',
  );
  t.is(
    zlib.gunzipSync(fileContents).toString(),
    'abc',
    'gunzip(fileContents) must match input data',
  );
});

test('snapStore prepare / commit delete is robust', async t => {
  const io = {
    measureSeconds: makeMeasureSeconds(() => 0),
  };
  const db = sqlite3(':memory:');
  const [archiveDir, cleanupArchives] = await tmpDir('archives');
  t.teardown(cleanupArchives);
  const fsPowers = { fs, path, tmp };
  const archiveSnapshot = makeArchiveSnapshot(archiveDir, fsPowers);
  const store = makeSnapStore(db, ensureTxn, io, () => {}, {
    keepSnapshots: true,
    archiveSnapshot,
  });

  const hashes = [];
  const expectedFiles = [];
  for (let i = 0; i < 5; i += 1) {
    const { hash } = await store.saveSnapshot(
      'fakeVatID2',
      i,
      getSnapshotStream(`file ${i}`),
    );
    hashes.push(hash);
    expectedFiles.push(`snapshot.fakeVatID2.${i}.gz`);
  }
  const sqlCountSnapshots = db.prepare(`
    SELECT COUNT(*)
    FROM snapshots
  `);
  sqlCountSnapshots.pluck(true);

  t.is(sqlCountSnapshots.get(), 5);
  t.deepEqual(fs.readdirSync(archiveDir), expectedFiles);

  store.deleteSnapshotByHash('fakeVatID2', hashes[2]);
  t.is(sqlCountSnapshots.get(), 4);
  t.deepEqual(fs.readdirSync(archiveDir), expectedFiles);

  // Restore (re-save) between prepare and commit.
  store.deleteSnapshotByHash('fakeVatID2', hashes[3]);
  await store.saveSnapshot('fakeVatID3', 29, getSnapshotStream(`file 3`));
  expectedFiles.push(`snapshot.fakeVatID3.29.gz`);
  t.true(store.hasHash('fakeVatID3', hashes[3]));
  t.deepEqual(fs.readdirSync(archiveDir), expectedFiles);

  store.deleteVatSnapshots('fakeVatID2');
  t.is(sqlCountSnapshots.get(), 1);
  store.deleteVatSnapshots('fakeVatID3');
  t.is(sqlCountSnapshots.get(), 0);
  t.deepEqual(fs.readdirSync(archiveDir), expectedFiles);

  for (let i = 0; i < 5; i += 1) {
    const { hash } = await store.saveSnapshot(
      'fakeVatID4',
      i,
      getSnapshotStream(`file ${i}`),
    );
    hashes.push(hash);
    expectedFiles.push(`snapshot.fakeVatID4.${i}.gz`);
  }
  t.is(sqlCountSnapshots.get(), 5);
  store.deleteAllUnusedSnapshots();
  t.is(sqlCountSnapshots.get(), 1);
  t.deepEqual(fs.readdirSync(archiveDir), expectedFiles);
});
