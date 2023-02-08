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
  const snapStore = makeSnapStore(db, makeSnapStoreIO());
  const kernelStorage = { ...initSwingStore().kernelStorage, snapStore };

  const argv = [];
  await initializeSwingset(config, argv, kernelStorage);

  const c1 = await makeSwingsetController(kernelStorage, null);
  c1.pinVatRoot('target');
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    const snapshotInfo = snapStore.getSnapshotInfo(vatID);

    const start = snapshotInfo ? snapshotInfo.endPos : 0;
    const bounds = kernelStorage.transcriptStore.getCurrentSpanBounds(vatID);
    const end = bounds.endPos;
    return [start, end];
  }

  const expected1 = [];
  c1.queueToVatRoot('target', 'count', []);
  expected1.push(`count = 0`);
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [0, 2]);

  for (let i = 1; i < 11; i += 1) {
    c1.queueToVatRoot('target', 'count', []);
    expected1.push(`count = ${i}`);
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [8, 12]);
  await c1.shutdown();

  const c2 = await makeSwingsetController(kernelStorage);
  const expected2 = [`count = 7`, `count = 8`, `count = 9`, `count = 10`];
  t.deepEqual(c2.dump().log, expected2); // replayed 4 deliveries
  c2.queueToVatRoot('target', 'count', []);
  expected2.push(`count = 11`);
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [13, 13]);
  await c2.shutdown();
});
