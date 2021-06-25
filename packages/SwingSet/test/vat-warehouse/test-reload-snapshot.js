/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import fs from 'fs';
import path from 'path';
import { tmpName } from 'tmp';
import { makeSnapStore } from '@agoric/xsnap';
import { provideHostStorage } from '../../src/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs } from '../util.js';

test('vat reload from snapshot', async t => {
  const config = {
    vats: {
      target: {
        sourceSpec: path.join(__dirname, 'vat-warehouse-reload.js'),
        creationOptions: { managerType: 'xs-worker' },
      },
    },
  };

  const snapstorePath = path.resolve(__dirname, './fixture-xs-snapshots/');
  fs.mkdirSync(snapstorePath, { recursive: true });
  t.teardown(() => fs.rmdirSync(snapstorePath, { recursive: true }));

  const snapStore = makeSnapStore(snapstorePath, {
    tmpName,
    existsSync: fs.existsSync,
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    rename: fs.promises.rename,
    unlink: fs.promises.unlink,
    resolve: path.resolve,
  });
  const hostStorage = { snapStore, ...provideHostStorage() };

  const argv = [];
  await initializeSwingset(config, argv, hostStorage);

  const c1 = await makeSwingsetController(hostStorage, null, {
    warehousePolicy: { initialSnapshot: 2, snapshotInterval: 5 },
  });
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    const lastSnapshot = hostStorage.kvStore.get(`${vatID}.lastSnapshot`);
    const start = lastSnapshot
      ? JSON.parse(lastSnapshot).startPos.itemCount
      : 0;
    const endPosition = hostStorage.kvStore.get(`${vatID}.t.endPosition`);
    const end = JSON.parse(endPosition).itemCount;
    return [start, end];
  }

  const expected1 = [];
  c1.queueToVatExport('target', 'o+0', 'count', capargs([]));
  expected1.push(`count = 0`);
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [0, 1]);

  for (let i = 1; i < 11; i += 1) {
    c1.queueToVatExport('target', 'o+0', 'count', capargs([]));
    expected1.push(`count = ${i}`);
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [7, 11]);
  await c1.shutdown();

  const c2 = await makeSwingsetController(hostStorage);
  const expected2 = [`count = 7`, `count = 8`, `count = 9`, `count = 10`];
  t.deepEqual(c2.dump().log, expected2); // replayed 4 deliveries
  c2.queueToVatExport('target', 'o+0', 'count', capargs([]));
  expected2.push(`count = 11`);
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [7, 12]);
});
