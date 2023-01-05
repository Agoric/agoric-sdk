// @ts-check

import '@endo/init/debug.js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import sqlite3 from 'better-sqlite3';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '../src/snapStore.js';

test('build temp file; compress to cache file', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const db = sqlite3(':memory:');
  const store = makeSnapStore(db, pool.name, {
    ...tmp,
    tmpFile: tmp.file,
    ...path,
    ...fs,
    ...fs.promises,
    measureSeconds: makeMeasureSeconds(() => 0),
  });
  let keepTmp = '';
  const result = await store.save(async filePath => {
    t.falsy(fs.existsSync(filePath));
    fs.writeFileSync(filePath, 'abc');
    keepTmp = filePath;
  });
  const { hash } = result;
  const expectedHash =
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  t.like(result, {
    hash: expectedHash,
    rawByteCount: 3,
    rawSaveSeconds: 0,
    compressSeconds: 0,
  });
  t.is(store.has(hash), true);
  const zero =
    '0000000000000000000000000000000000000000000000000000000000000000';
  t.is(store.has(zero), false);
  t.falsy(
    fs.existsSync(keepTmp),
    'temp file should have been deleted after withTempName',
  );

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
});

test('snapStore prepare / commit delete is robust', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const io = {
    ...tmp,
    tmpFile: tmp.file,
    ...path,
    ...fs,
    ...fs.promises,
    measureSeconds: makeMeasureSeconds(() => 0),
  };
  const db = sqlite3(':memory:');
  const store = makeSnapStore(db, pool.name, io);

  const hashes = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { hash } = await store.save(async fn =>
      fs.promises.writeFile(fn, `file ${i}`),
    );
    hashes.push(hash);
  }
  const sqlCountSnapshots = db.prepare(`
    SELECT COUNT(*)
    FROM snapshots
  `);
  sqlCountSnapshots.pluck(true);

  t.is(sqlCountSnapshots.get(), 5);

  store.deleteSnapshot(hashes[2]);
  t.is(sqlCountSnapshots.get(), 4);

  // Restore (re-save) between prepare and commit.
  store.deleteSnapshot(hashes[3]);
  await store.save(async fn => fs.promises.writeFile(fn, `file 3`));
  t.true(store.has(hashes[3]));

  hashes.forEach(store.deleteSnapshot);
  t.is(sqlCountSnapshots.get(), 0);
});
