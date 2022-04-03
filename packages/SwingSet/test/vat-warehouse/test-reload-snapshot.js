// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import tmp from 'tmp';
import { makeSnapStore, makeSnapStoreIO } from '@agoric/swing-store';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

test('vat reload from snapshot', async t => {
  const config = {
    defaultReapInterval: 'never',
    vats: {
      target: {
        sourceSpec: new URL('vat-warehouse-reload.js', import.meta.url)
          .pathname,
        creationOptions: { managerType: 'xs-worker' },
      },
    },
  };

  const snapstorePath = tmp.dirSync({ unsafeCleanup: true }).name;

  const snapStore = makeSnapStore(snapstorePath, makeSnapStoreIO());
  const hostStorage = { snapStore, ...provideHostStorage() };

  const argv = [];
  await initializeSwingset(config, argv, hostStorage);

  const c1 = await makeSwingsetController(hostStorage, null, {
    warehousePolicy: { snapshotInitial: 3, snapshotInterval: 5 },
  });
  c1.pinVatRoot('target');
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    const lastSnapshot = hostStorage.kvStore.get(`local.${vatID}.lastSnapshot`);
    const start = lastSnapshot
      ? JSON.parse(lastSnapshot).startPos.itemCount
      : 0;
    const endPosition = hostStorage.kvStore.get(`${vatID}.t.endPosition`);
    const end = JSON.parse(endPosition).itemCount;
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

  const c2 = await makeSwingsetController(hostStorage);
  const expected2 = [`count = 7`, `count = 8`, `count = 9`, `count = 10`];
  t.deepEqual(c2.dump().log, expected2); // replayed 4 deliveries
  c2.queueToVatRoot('target', 'count', []);
  expected2.push(`count = 11`);
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [8, 13]);
});
