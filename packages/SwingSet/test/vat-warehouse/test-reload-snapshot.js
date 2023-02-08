// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import sqlite3 from 'better-sqlite3';
import {
  initSwingStore,
  makeSnapStore,
  makeSnapStoreIO,
} from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

test('vat reload from snapshot', async t => {
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

  const c1 = await makeSwingsetController(kernelStorage, null);
  c1.pinVatRoot('target');
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    const snapshotInfo = snapStore.getSnapshotInfo(vatID);

    const snap = snapshotInfo ? snapshotInfo.endPos : 0;
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
  // * 3: save-snapshot
  // * 4: load-snapshot
  expected1.push(`count = 0`);
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [3, 4, 5]);

  for (let i = 1; i < 11; i += 1) {
    c1.queueToVatRoot('target', 'count', []);
    // * 5: message (count=1)
    // * 6: message (count=2)
    // * 7: message (count=3)
    // * then we hit snapshotInterval
    // * 8: save-snapshot
    // * 9: load-snapshot
    // * 10: message (count=4)
    // * 11: message (count=5)
    // * 12: message (count=6)
    // * then we hit snapshotInterval
    // * 13: save-snapshot
    // * 14: load-snapshot
    // * 15: message (count=7)
    // * 16: message (count=8)
    // * 17: message (count=9)
    // * then we hit snapshotInterval
    // * 18: save-snapshot
    // * 19: load-snapshot
    // * 20: message (count=10)
    expected1.push(`count = ${i}`);
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [18, 19, 21]);
  await c1.shutdown();

  // the worker will start with the load-snapshot at d19, and replay d20
  const c2 = await makeSwingsetController(kernelStorage);
  const expected2 = [`count = 10`];
  t.deepEqual(c2.dump().log, expected2); // replayed 4 deliveries
  c2.queueToVatRoot('target', 'count', []);
  // * 21: message(count=11)
  expected2.push(`count = 11`);
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [18, 19, 22]);
  await c2.shutdown();
});
