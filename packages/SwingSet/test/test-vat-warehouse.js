/* global __dirname */
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import path from 'path';
import { provideHostStorage } from '../src/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import { capargs } from './util.js';

test('vat reload from snapshot', async t => {
  const config = {
    vats: {
      target: {
        sourceSpec: path.join(__dirname, 'vat-warehouse-reload.js'),
      },
    },
  };
  const hostStorage = provideHostStorage();
  const argv = [];
  await initializeSwingset(config, argv, hostStorage);

  const c1 = await makeSwingsetController(hostStorage);
  const vatID = c1.vatNameToID('target');

  function getPositions() {
    let start = hostStorage.kvStore.get(`${vatID}.t.startPosition`);
    let end = hostStorage.kvStore.get(`${vatID}.t.endPosition`);
    return [Number(start), Number(end)];
  }

  const expected1 = [];
  c1.queueToVatExport('target', 'o+0', 'count', capargs([]));
  expected1.push(`count = 0`);
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [0, 1]); // or something

  for (let i=1; i < 11; i++) {
    c1.queueToVatExport('target', 'o+0', 'count', capargs([]));
    expected1.push(`count = ${i}`);
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  t.deepEqual(getPositions(), [5, 11]); // or something
  await c1.shutdown();

  const c2 = await makeSwingsetController(hostStorage);
  const expected2 = [];
  c2.queueToVatExport('target', 'o+0', 'count', capargs([]));
  expected2.push(`count = 12`); // or something
  await c2.run();
  t.deepEqual(c2.dump().log, expected2); // note: *not* 0-11
  t.deepEqual(getPositions(), [5, 12]); // or something


});
