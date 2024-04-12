// @ts-check
import test from 'ava';
import path from 'path';

import { Buffer } from 'node:buffer';
import sqlite3 from 'better-sqlite3';
import { tmpDir } from './util.js';
import { initSwingStore } from '../src/swingStore.js';
import { makeSwingStoreExporter } from '../src/exporter.js';
import { importSwingStore } from '../src/importer.js';

async function* getSnapshotStream() {
  yield Buffer.from('abc');
}
harden(getSnapshotStream);

// update 'data' with the callback deltas to get a new current
// export-data record
const mergeExportDeltas = (data, exports) => {
  for (const [key, value] of exports) {
    if (value) {
      data[key] = value;
    } else {
      delete data[key];
    }
  }
};

const mapToObj = map => Object.fromEntries(map.entries());

test('delete snapshots with export callback', async t => {
  const exportLog = [];
  const exportData = {};
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
    mergeExportDeltas(exportData, exports);
  };
  const store = initSwingStore(null, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { snapStore } = kernelStorage;
  const { commit } = hostStorage;
  const vatID = 'v1';
  await snapStore.saveSnapshot(vatID, 10, getSnapshotStream());
  await snapStore.saveSnapshot(vatID, 11, getSnapshotStream());
  await snapStore.saveSnapshot(vatID, 12, getSnapshotStream());
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);

  await commit();

  t.is(exportLog.length, 4);
  t.is(exportLog[0][0], 'snapshot.v1.10');
  t.is(exportLog[1][0], 'snapshot.v1.11');
  t.is(exportLog[2][0], 'snapshot.v1.12');
  t.is(exportLog[3][0], 'snapshot.v1.current');
  const hash = JSON.parse(exportLog[0][1]).hash;
  t.deepEqual(exportData, {
    'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
    'snapshot.v1.11': JSON.stringify({ vatID, snapPos: 11, hash, inUse: 0 }),
    'snapshot.v1.12': JSON.stringify({ vatID, snapPos: 12, hash, inUse: 1 }),
    'snapshot.v1.current': 'snapshot.v1.12',
  });
  exportLog.length = 0;

  // in a previous version, deleteVatSnapshots caused overlapping SQL
  // queries, and failed
  snapStore.deleteVatSnapshots(vatID);
  await commit();

  t.deepEqual(exportLog, [
    ['snapshot.v1.10', null],
    ['snapshot.v1.11', null],
    ['snapshot.v1.12', null],
    ['snapshot.v1.current', null],
  ]);
  exportLog.length = 0;
  t.deepEqual(exportData, {});
});

test('delete transcripts with export callback', async t => {
  const exportLog = [];
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
  };
  const store = initSwingStore(null, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { transcriptStore } = kernelStorage;
  const { commit } = hostStorage;

  transcriptStore.initTranscript('v1');
  transcriptStore.addItem('v1', 'aaa');
  transcriptStore.addItem('v1', 'bbb');
  transcriptStore.addItem('v1', 'ccc');
  transcriptStore.rolloverSpan('v1');
  transcriptStore.addItem('v1', 'ddd');
  transcriptStore.addItem('v1', 'eee');
  transcriptStore.addItem('v1', 'fff');
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);

  await commit();

  t.is(exportLog.length, 2);
  t.is(exportLog[0][0], 'transcript.v1.0');
  t.is(exportLog[1][0], 'transcript.v1.current');
  exportLog.length = 0;

  // in a previous version, deleteVatTranscripts caused overlapping SQL
  // queries, and failed
  transcriptStore.deleteVatTranscripts('v1');
  await commit();

  t.deepEqual(exportLog, [
    ['transcript.v1.0', null],
    ['transcript.v1.current', null],
  ]);

  exportLog.length = 0;
});

const getExport = async (dbDir, artifactMode) => {
  const exporter = makeSwingStoreExporter(dbDir, { artifactMode });
  const exportData = new Map();
  for await (const [key, value] of exporter.getExportData()) {
    exportData.set(key, value);
  }
  const artifactNames = [];
  for await (const name of exporter.getArtifactNames()) {
    artifactNames.push(name);
  }
  await exporter.close();
  return { exportData, artifactNames };
};

const reImport = async (t, dbDir, artifactMode) => {
  const [dbDir2, cleanup] = await tmpDir('testdb2');
  t.teardown(cleanup);
  const exporter = makeSwingStoreExporter(dbDir, { artifactMode });
  const ss2 = await importSwingStore(exporter, dbDir2, { artifactMode });
  await ss2.hostStorage.commit();
  return sqlite3(path.join(dbDir2, 'swingstore.sqlite'));
};

const compareNoHash = (t, obj1, obj2) => {
  const o1 = {};
  for (const [key, value] of Object.entries(obj1)) {
    const { hash: _, ...data } = JSON.parse(value);
    o1[key] = data;
  }
  return t.deepEqual(o1, obj2);
};

const setupTranscript = async t => {
  const vatID = 'v1';
  const exportLog = [];
  const currentExportData = {};
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
    mergeExportDeltas(currentExportData, exports);
  };
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const store = initSwingStore(dbDir, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { transcriptStore } = kernelStorage;
  const { commit } = hostStorage;
  // look directly at DB to confirm changes
  const db = sqlite3(path.join(dbDir, 'swingstore.sqlite'));

  // two incarnations, two spans each
  transcriptStore.initTranscript(vatID);
  transcriptStore.addItem(vatID, 'aaa');
  transcriptStore.addItem(vatID, 'bbb');
  transcriptStore.rolloverSpan(vatID);
  transcriptStore.addItem(vatID, 'ccc');
  transcriptStore.addItem(vatID, 'ddd');
  transcriptStore.rolloverIncarnation(vatID);
  transcriptStore.addItem(vatID, 'eee');
  transcriptStore.addItem(vatID, 'fff');
  transcriptStore.rolloverSpan(vatID);
  transcriptStore.addItem(vatID, 'ggg');
  transcriptStore.addItem(vatID, 'hhh');
  await commit();

  return {
    db,
    dbDir,
    commit,
    transcriptStore,
    exportLog,
    currentExportData,
    vatID,
  };
};

test('slow deletion of transcripts', async t => {
  // slow transcript deletion should remove export-data as it removes
  // transcript spans and their items

  const {
    db,
    dbDir,
    commit,
    transcriptStore,
    exportLog,
    currentExportData,
    vatID,
  } = await setupTranscript(t);

  t.is(exportLog.length, 4);
  t.is(exportLog[0][0], 'transcript.v1.0');
  t.is(exportLog[1][0], 'transcript.v1.2');
  t.is(exportLog[2][0], 'transcript.v1.4');
  t.is(exportLog[3][0], 'transcript.v1.current');
  exportLog.length = 0;
  const t0 = { vatID, startPos: 0, endPos: 2, isCurrent: 0, incarnation: 0 };
  const t2 = { vatID, startPos: 2, endPos: 4, isCurrent: 0, incarnation: 0 };
  const t4 = { vatID, startPos: 4, endPos: 6, isCurrent: 0, incarnation: 1 };
  const tc = { vatID, startPos: 6, endPos: 8, isCurrent: 1, incarnation: 1 };
  const t6 = { vatID, startPos: 6, endPos: 8, isCurrent: 0, incarnation: 1 };
  compareNoHash(t, currentExportData, {
    'transcript.v1.0': t0,
    'transcript.v1.2': t2,
    'transcript.v1.4': t4,
    'transcript.v1.current': tc,
  });

  t.is(db.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 8);
  t.is(db.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 4);

  // an "operational"-mode export should list all spans, but only have
  // artifacts for the current one
  {
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(currentExportData, mapToObj(exportData));
    compareNoHash(t, mapToObj(exportData), {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
      'transcript.v1.current': tc,
    });
    t.deepEqual(artifactNames, ['transcript.v1.6.8']);
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 2);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 4);
  }

  // an "archival"-mode export should list all four spans, with
  // artifacts for each
  {
    const { exportData, artifactNames } = await getExport(dbDir, 'archival');
    compareNoHash(t, mapToObj(exportData), {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
      'transcript.v1.current': tc,
    });
    t.deepEqual(artifactNames, [
      'transcript.v1.0.2',
      'transcript.v1.2.4',
      'transcript.v1.4.6',
      'transcript.v1.6.8',
    ]);
    const db2 = await reImport(t, dbDir, 'archival');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 8);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 4);
  }

  // prepare for deletion, this adds a new "closed" record, and
  // deletes the .current record (i.e. it transforms .current into a
  // closed record)
  {
    transcriptStore.stopUsingTranscript(vatID);
    await commit();
    compareNoHash(t, currentExportData, {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
      'transcript.v1.6': t6,
    });
    exportLog.length = 0;
    // stopUsingTranscript is idempotent
    transcriptStore.stopUsingTranscript(vatID);
    await commit();
    t.is(exportLog.length, 0);
  }

  // All exports (debug and non-debug) in this "terminated but not
  // deleted" state will still have the export-data keys. Only
  // debug-mode will have artifacts.
  for (const mode of ['operational', 'replay', 'archival', 'debug']) {
    const { exportData, artifactNames } = await getExport(dbDir, mode);
    compareNoHash(t, mapToObj(exportData), {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
      'transcript.v1.6': t6,
    });
    if (mode === 'debug') {
      t.deepEqual(artifactNames, [
        'transcript.v1.0.2',
        'transcript.v1.2.4',
        'transcript.v1.4.6',
        'transcript.v1.6.8',
      ]);
    } else {
      t.deepEqual(artifactNames, []);
    }
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 0);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 4);
  }

  // first deletion
  {
    // budget=1 will let it delete one span, the last one
    const dc = transcriptStore.deleteVatTranscripts(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    compareNoHash(t, currentExportData, {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
    });
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 6);
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 3);
  }

  // Exports in this partially-deleted state should be coherent: they
  // provide a subset of the older spans (the not-yet-deleted ones,
  // all of which have isCurrent=0) and no items (even for
  // not-yet-deleted spans). The import-time assertComplete() test
  // must be satisfied.

  for (const mode of ['operational', 'replay', 'archival', 'debug']) {
    const { exportData, artifactNames } = await getExport(dbDir, mode);
    compareNoHash(t, mapToObj(exportData), {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
    });
    if (mode === 'debug') {
      t.deepEqual(artifactNames, [
        'transcript.v1.0.2',
        'transcript.v1.2.4',
        'transcript.v1.4.6',
      ]);
    } else {
      t.deepEqual(artifactNames, []);
    }
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 0);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 3);
  }

  // second deletion
  {
    const dc = transcriptStore.deleteVatTranscripts(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    compareNoHash(t, currentExportData, {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
    });
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 4);
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 2);
  }

  for (const mode of ['operational', 'replay', 'archival', 'debug']) {
    const { exportData, artifactNames } = await getExport(dbDir, mode);
    compareNoHash(t, mapToObj(exportData), {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
    });
    if (mode === 'debug') {
      t.deepEqual(artifactNames, ['transcript.v1.0.2', 'transcript.v1.2.4']);
    } else {
      t.deepEqual(artifactNames, []);
    }
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 0);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 2);
  }

  // last deletion, enough budget to finish
  {
    const dc = transcriptStore.deleteVatTranscripts(vatID, 5);
    t.true(dc.done);
    t.is(dc.cleanups, 2);
    await commit();
    compareNoHash(t, currentExportData, {});
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 0);
    t.is(db.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 0);
  }

  for (const mode of ['operational', 'replay', 'archival', 'debug']) {
    const { exportData, artifactNames } = await getExport(dbDir, mode);
    compareNoHash(t, mapToObj(exportData), {});
    t.deepEqual(artifactNames, []);
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptItems').pluck().get(), 0);
    t.is(db2.prepare('SELECT COUNT(*) FROM transcriptSpans').pluck().get(), 0);
  }

  // deleteVatTranscripts is idempotent
  {
    exportLog.length = 0;
    const dc = transcriptStore.deleteVatTranscripts(vatID, 5);
    t.true(dc.done);
    t.is(dc.cleanups, 0);
    await commit();
    t.is(exportLog.length, 0);
  }
});

test('slow deletion without stopUsingTranscript', async t => {
  // slow deletion should work even without stopUsingTranscript
  const { dbDir, commit, transcriptStore, currentExportData, vatID } =
    await setupTranscript(t);

  // first deletion
  {
    // budget=1 will let it delete one span, the last one. Because we
    // didn't call stopUsingTranscript, this also removes the .current
    // record
    const dc = transcriptStore.deleteVatTranscripts(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    const t0 = { vatID, startPos: 0, endPos: 2, isCurrent: 0, incarnation: 0 };
    const t2 = { vatID, startPos: 2, endPos: 4, isCurrent: 0, incarnation: 0 };
    const t4 = { vatID, startPos: 4, endPos: 6, isCurrent: 0, incarnation: 1 };
    compareNoHash(t, currentExportData, {
      'transcript.v1.0': t0,
      'transcript.v1.2': t2,
      'transcript.v1.4': t4,
    });
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(mapToObj(exportData), currentExportData);
    t.deepEqual(artifactNames, []);
  }
  transcriptStore.deleteVatTranscripts(vatID);
  await commit();
  t.deepEqual(currentExportData, {});
  {
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(exportData, new Map());
    t.deepEqual(artifactNames, []);
  }
});

test('full deletion without stopUsingTranscript', async t => {
  // full deletion should work even without stopUsingTranscript
  const { dbDir, commit, transcriptStore, currentExportData, vatID } =
    await setupTranscript(t);
  const dc = transcriptStore.deleteVatTranscripts(vatID);
  t.true(dc.done);
  await commit();
  t.deepEqual(currentExportData, {});
  const { exportData, artifactNames } = await getExport(dbDir, 'operational');
  t.deepEqual(exportData, new Map());
  t.deepEqual(artifactNames, []);
});

const setupSnapshots = async t => {
  const vatID = 'v1';
  const exportLog = [];
  const currentExportData = {};
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
    mergeExportDeltas(currentExportData, exports);
  };
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  const store = initSwingStore(dbDir, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { snapStore } = kernelStorage;
  const { commit } = hostStorage;
  // look directly at DB to confirm changes
  const db = sqlite3(path.join(dbDir, 'swingstore.sqlite'));

  await snapStore.saveSnapshot(vatID, 10, getSnapshotStream());
  await snapStore.saveSnapshot(vatID, 11, getSnapshotStream());
  await snapStore.saveSnapshot(vatID, 12, getSnapshotStream());
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);
  await commit();
  const hash = JSON.parse(exportLog[0][1]).hash;

  return {
    db,
    dbDir,
    commit,
    snapStore,
    exportLog,
    currentExportData,
    vatID,
    hash,
  };
};

test('slow deletion of snapshots', async t => {
  // slow snapshot deletion should remove export-data as it removes
  // snapshots
  const {
    db,
    dbDir,
    commit,
    snapStore,
    exportLog,
    currentExportData,
    vatID,
    hash,
  } = await setupSnapshots(t);
  t.deepEqual(currentExportData, {
    'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
    'snapshot.v1.11': JSON.stringify({ vatID, snapPos: 11, hash, inUse: 0 }),
    'snapshot.v1.12': JSON.stringify({ vatID, snapPos: 12, hash, inUse: 1 }),
    'snapshot.v1.current': 'snapshot.v1.12',
  });

  t.is(db.prepare('SELECT COUNT(*) FROM snapshots').pluck().get(), 3);
  {
    // export should mention all spans, with a single current artifact
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(currentExportData, mapToObj(exportData));
    t.is(exportData.get('snapshot.v1.current'), 'snapshot.v1.12');
    t.deepEqual(artifactNames, ['snapshot.v1.12']);
  }

  // Prepare for deletion, this clears the .inUse flag on the latest
  // record, and deletes the .current record. Exports stop including
  // any artifacts.
  {
    snapStore.stopUsingLastSnapshot(vatID);
    await commit();
    t.deepEqual(currentExportData, {
      'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
      'snapshot.v1.11': JSON.stringify({ vatID, snapPos: 11, hash, inUse: 0 }),
      'snapshot.v1.12': JSON.stringify({ vatID, snapPos: 12, hash, inUse: 0 }),
    });
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(currentExportData, mapToObj(exportData));
    t.deepEqual(artifactNames, []);
    exportLog.length = 0;
    // stopUsingLastSnapshot is idempotent
    snapStore.stopUsingLastSnapshot(vatID);
    await commit();
    t.is(exportLog.length, 0);
  }

  // first deletion
  {
    // budget=1 will let it delete one snapshot
    const dc = snapStore.deleteVatSnapshots(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    t.deepEqual(currentExportData, {
      'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
      'snapshot.v1.11': JSON.stringify({ vatID, snapPos: 11, hash, inUse: 0 }),
    });
    t.is(db.prepare('SELECT COUNT(*) FROM snapshots').pluck().get(), 2);
    // export should mention fewer spans, have no .current or
    // artifacts
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(currentExportData, mapToObj(exportData));
    t.deepEqual(artifactNames, []);
    // and it should be importable
    const db2 = await reImport(t, dbDir, 'operational');
    t.is(db2.prepare('SELECT COUNT(*) FROM snapshots').pluck().get(), 2);
    const db3 = await reImport(t, dbDir, 'archival');
    t.is(db3.prepare('SELECT COUNT(*) FROM snapshots').pluck().get(), 2);
  }

  // second+last deletion, enough budget to delete both remaining
  // snapshots
  {
    const dc = snapStore.deleteVatSnapshots(vatID, 5);
    t.true(dc.done);
    t.is(dc.cleanups, 2);
    await commit();
    t.deepEqual(currentExportData, {});
    t.is(db.prepare('SELECT COUNT(*) FROM snapshots').pluck().get(), 0);
    // export should mention nothing
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(currentExportData, mapToObj(exportData));
    t.deepEqual(artifactNames, []);
  }
});

test('slow deletion without stopUsingLastSnapshot', async t => {
  // slow snapshot deletion should work even without
  // stopUsingLastSnapshot
  const { dbDir, commit, snapStore, currentExportData, vatID, hash } =
    await setupSnapshots(t);

  {
    // budget=1 will let it delete one snapshot, the last one. Because
    // we didn't call stopUsingLastSnapshot, this also removes the
    // .current record
    const dc = snapStore.deleteVatSnapshots(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    t.deepEqual(currentExportData, {
      'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
      'snapshot.v1.11': JSON.stringify({ vatID, snapPos: 11, hash, inUse: 0 }),
    });
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(mapToObj(exportData), currentExportData);
    t.deepEqual(artifactNames, []);
  }

  {
    const dc = snapStore.deleteVatSnapshots(vatID, 1);
    t.false(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    t.deepEqual(currentExportData, {
      'snapshot.v1.10': JSON.stringify({ vatID, snapPos: 10, hash, inUse: 0 }),
    });
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(mapToObj(exportData), currentExportData);
    t.deepEqual(artifactNames, []);
  }

  {
    const dc = snapStore.deleteVatSnapshots(vatID, 1);
    t.true(dc.done);
    t.is(dc.cleanups, 1);
    await commit();
    t.deepEqual(currentExportData, {});
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(mapToObj(exportData), currentExportData);
    t.deepEqual(artifactNames, []);
  }
});

test('full deletion without stopUsingLastSnapshot', async t => {
  // full snapshot deletion should work even without
  // stopUsingLastSnapshot
  const { dbDir, commit, snapStore, currentExportData, vatID } =
    await setupSnapshots(t);

  {
    const dc = snapStore.deleteVatSnapshots(vatID);
    t.true(dc.done);
    // no budget means no accounting, ignore dc.cleanups
    await commit();
    t.deepEqual(currentExportData, {});
    const { exportData, artifactNames } = await getExport(dbDir, 'operational');
    t.deepEqual(mapToObj(exportData), currentExportData);
    t.deepEqual(artifactNames, []);
  }
});
