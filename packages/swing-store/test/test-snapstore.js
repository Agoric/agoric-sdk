// @ts-check

import { Buffer } from 'node:buffer';
import zlib from 'zlib';
import sqlite3 from 'better-sqlite3';

import test from 'ava';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '../src/snapStore.js';

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
  const store = makeSnapStore(
    db,
    ensureTxn,
    {
      measureSeconds: makeMeasureSeconds(() => 0),
    },
    exportLog.noteExport,
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
  const contents = zlib.gunzipSync(snapshotGZ);
  t.is(contents.toString(), 'abc', 'gunzip(contents) matches original');
  const logInfo = { vatID: 'fakeVatID', ...exportInfo };
  t.deepEqual(exportLog.getLog(), [
    ['snapshot.fakeVatID.47', JSON.stringify(logInfo)],
    ['snapshot.fakeVatID.current', `snapshot.fakeVatID.47`],
  ]);
});

test('snapStore prepare / commit delete is robust', async t => {
  const io = {
    measureSeconds: makeMeasureSeconds(() => 0),
  };
  const db = sqlite3(':memory:');
  const store = makeSnapStore(db, ensureTxn, io, () => {}, {
    keepSnapshots: true,
  });

  const hashes = [];
  for (let i = 0; i < 5; i += 1) {
    const { hash } = await store.saveSnapshot(
      'fakeVatID2',
      i,
      getSnapshotStream(`file ${i}`),
    );
    hashes.push(hash);
  }
  const sqlCountSnapshots = db.prepare(`
    SELECT COUNT(*)
    FROM snapshots
  `);
  sqlCountSnapshots.pluck(true);

  t.is(sqlCountSnapshots.get(), 5);

  store.deleteSnapshotByHash('fakeVatID2', hashes[2]);
  t.is(sqlCountSnapshots.get(), 4);

  // Restore (re-save) between prepare and commit.
  store.deleteSnapshotByHash('fakeVatID2', hashes[3]);
  await store.saveSnapshot('fakeVatID3', 29, getSnapshotStream(`file 3`));
  t.true(store.hasHash('fakeVatID3', hashes[3]));

  store.deleteVatSnapshots('fakeVatID2');
  t.is(sqlCountSnapshots.get(), 1);
  store.deleteVatSnapshots('fakeVatID3');
  t.is(sqlCountSnapshots.get(), 0);

  for (let i = 0; i < 5; i += 1) {
    const { hash } = await store.saveSnapshot(
      'fakeVatID4',
      i,
      getSnapshotStream(`file ${i}`),
    );
    hashes.push(hash);
  }
  t.is(sqlCountSnapshots.get(), 5);
  store.deleteAllUnusedSnapshots();
  t.is(sqlCountSnapshots.get(), 1);
});
