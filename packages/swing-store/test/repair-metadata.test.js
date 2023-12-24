// @ts-check

import path from 'path';
import test from 'ava';
import sqlite3 from 'better-sqlite3';

import { importSwingStore, openSwingStore } from '../src/index.js';

import { makeExporter, buildData } from './exports.js';
import { tmpDir } from './util.js';

test('repair metadata', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts } = buildData();

  // simulate a swingstore broken by #8025 by importing everything,
  // then manually deleting the historical metadata entries from the
  // DB
  const exporter = makeExporter(exportData, artifacts);
  const ssi = await importSwingStore(exporter, dbDir);
  await ssi.hostStorage.commit();
  await ssi.hostStorage.close();

  const filePath = path.join(dbDir, 'swingstore.sqlite');
  const db = sqlite3(filePath);

  const getTS = db.prepare(
    'SELECT startPos FROM transcriptSpans WHERE vatID = ? ORDER BY startPos',
  );
  getTS.pluck();
  const getSS = db.prepare(
    'SELECT snapPos FROM snapshots WHERE vatID = ? ORDER BY snapPos',
  );
  getSS.pluck();

  // assert that all the metadata is there at first
  const ts1 = getTS.all('v1');
  t.deepEqual(ts1, [0, 2, 5, 8]); // four spans
  const ss1 = getSS.all('v1');
  t.deepEqual(ss1, [4, 7]); // two snapshots

  // now clobber them to simulate #8025 (note: these auto-commit)
  db.prepare('DELETE FROM transcriptSpans WHERE isCurrent IS NULL').run();
  db.prepare('DELETE FROM snapshots WHERE inUSE IS NULL').run();

  // confirm that we clobbered them
  const ts2 = getTS.all('v1');
  t.deepEqual(ts2, [8]); // only the latest
  const ss2 = getSS.all('v1');
  t.deepEqual(ss2, [7]);

  // now fix it
  const ss = openSwingStore(dbDir);
  t.teardown(ss.hostStorage.close);
  await ss.hostStorage.repairMetadata(exporter);
  await ss.hostStorage.commit();

  // and check that the metadata is back
  const ts3 = getTS.all('v1');
  t.deepEqual(ts3, [0, 2, 5, 8]); // all four again
  const ss3 = getSS.all('v1');
  t.deepEqual(ss3, [4, 7]);

  // repair should be idempotent
  await ss.hostStorage.repairMetadata(exporter);
  await ss.hostStorage.commit();

  const ts4 = getTS.all('v1');
  t.deepEqual(ts4, [0, 2, 5, 8]); // still there
  const ss4 = getSS.all('v1');
  t.deepEqual(ss4, [4, 7]);
});

test('repair metadata ignores kvStore entries', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts } = buildData();

  const exporter = makeExporter(exportData, artifacts);
  const ssi = await importSwingStore(exporter, dbDir);
  await ssi.hostStorage.commit();
  await ssi.hostStorage.close();

  // perform the repair with spurious kv entries
  exportData.set('kv.key2', 'value2');

  const ss = openSwingStore(dbDir);
  t.teardown(ss.hostStorage.close);
  await ss.hostStorage.repairMetadata(exporter);
  await ss.hostStorage.commit();

  // the spurious kv entry should be ignored
  t.deepEqual(ss.debug.dump().kvEntries, { key1: 'value1' });
});

test('repair metadata rejects mismatched snapshot entries', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts } = buildData();

  const exporter = makeExporter(exportData, artifacts);
  const ssi = await importSwingStore(exporter, dbDir);
  await ssi.hostStorage.commit();
  await ssi.hostStorage.close();

  // perform the repair with mismatched snapshot entry
  const old = JSON.parse(exportData.get('snapshot.v1.4'));
  const wrong = { ...old, hash: 'wrong' };
  exportData.set('snapshot.v1.4', JSON.stringify(wrong));

  const ss = openSwingStore(dbDir);
  t.teardown(ss.hostStorage.close);
  await t.throwsAsync(async () => ss.hostStorage.repairMetadata(exporter), {
    message: /repairSnapshotRecord metadata mismatch/,
  });
});

test('repair metadata rejects mismatched transcript span', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const { exportData, artifacts } = buildData();

  const exporter = makeExporter(exportData, artifacts);
  const ssi = await importSwingStore(exporter, dbDir);
  await ssi.hostStorage.commit();
  await ssi.hostStorage.close();

  // perform the repair with mismatched transcript span entry
  const old = JSON.parse(exportData.get('transcript.v1.0'));
  const wrong = { ...old, hash: 'wrong' };
  exportData.set('transcript.v1.0', JSON.stringify(wrong));

  const ss = openSwingStore(dbDir);
  t.teardown(ss.hostStorage.close);
  await t.throwsAsync(async () => ss.hostStorage.repairMetadata(exporter), {
    message: /repairTranscriptSpanRecord metadata mismatch/,
  });
});
