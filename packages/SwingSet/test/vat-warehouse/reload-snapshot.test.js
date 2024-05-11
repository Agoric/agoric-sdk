// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import sqlite3 from 'better-sqlite3';
import {
  initSwingStore,
  makeSnapStore,
  makeSnapStoreIO,
} from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

const vatReloadFromSnapshot = async (t, restartWorkerOnSnapshot) => {
  const config = {
    defaultReapInterval: 'never',
    snapshotInitial: 3,
    snapshotInterval: 5,
    vats: {
      target: {
        sourceSpec: new URL('vat-warehouse-reload.js', import.meta.url)
          .pathname,
        creationOptions: { managerType: 'xs-worker' },
      },
    },
  };

  const db = sqlite3(':memory:');
  const snapStore = makeSnapStore(db, () => {}, makeSnapStoreIO());
  const kernelStorage = { ...initSwingStore().kernelStorage, snapStore };

  const argv = [];
  await initializeSwingset(config, argv, kernelStorage);

  const warehousePolicy = { restartWorkerOnSnapshot };
  const runtimeOptions = { warehousePolicy };

  const c1 = await makeSwingsetController(kernelStorage, null, runtimeOptions);
  c1.pinVatRoot('target');
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    const snapshotInfo = snapStore.getSnapshotInfo(vatID);

    const snap = snapshotInfo ? snapshotInfo.snapPos : 0;
    const bounds = kernelStorage.transcriptStore.getCurrentSpanBounds(vatID);
    const start = bounds.startPos;
    const end = bounds.endPos;
    return [snap, start, end];
  }

  // the deliveries to vat-target are:
  // * 0: initialize-worker
  // * 1: startVat
  const expected1 = [];
  c1.queueToVatRoot('target', 'count', []);
  // * 2: message (count=0)
  // * then we hit snapshotInitial
  // * 3: BOYD
  // * 4: save-snapshot
  // * 5: load-snapshot
  expected1.push(`count = 0`);
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [4, 5, 6]);

  for (let i = 1; i < 11; i += 1) {
    c1.queueToVatRoot('target', 'count', []);
    // * 6: message (count=1)
    // * 7: message (count=2)
    // * 8: message (count=3)
    // * 9: message (count=4)
    // * then we hit snapshotInterval
    // * 9: BOYD
    // * 10: save-snapshot
    // * 11: load-snapshot
    // * 12: message (count=5)
    // * 13: message (count=6)
    // * 15: message (count=7)
    // * 16: message (count=8)
    // * then we hit snapshotInterval
    // * 17: BOYD
    // * 18: save-snapshot
    // * 19: load-snapshot
    // * 20: message (count=9)
    // * 21: message (count=10)
    expected1.push(`count = ${i}`);
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [18, 19, 22]);
  await c1.shutdown();

  // the worker will start with the load-snapshot at d19, and replay d20+d21
  const c2 = await makeSwingsetController(kernelStorage);
  const expected2 = [`count = 9`, `count = 10`];
  t.deepEqual(c2.dump().log, expected2); // replayed 4 deliveries
  c2.queueToVatRoot('target', 'count', []);
  // * 22: message(count=11)
  expected2.push(`count = 11`);
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [18, 19, 23]);
  await c2.shutdown();
};

test('vat reload from snapshot (restart worker)', vatReloadFromSnapshot, true);
test('vat reload from snapshot (reuse worker)', vatReloadFromSnapshot, false);
