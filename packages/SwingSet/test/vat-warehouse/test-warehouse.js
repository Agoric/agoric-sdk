/* global __dirname */
// @ts-check

// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava';
import path from 'path';
import fs from 'fs';
import { makeSnapStore } from '@agoric/xsnap';
import { loadBasedir, buildVatController } from '../../src/index.js';
import { provideHostStorage, makeSnapStoreIO } from '../../src/hostStorage.js';
import { makeLRU } from '../../src/kernel/vatManager/vat-warehouse.js';

async function makeController(managerType, runtimeOptions) {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType, enableDisavow: true };
  config.vats.target2 = config.vats.target;
  config.vats.target3 = config.vats.target;
  config.vats.target4 = config.vats.target;
  const c = await buildVatController(config, [], runtimeOptions);
  c.pinVatRoot('bootstrap');
  return c;
}

/** @type { (body: string, slots?: string[]) => SwingSetCapData } */
function capdata(body, slots = []) {
  return harden({ body, slots });
}

/** @type { (args: unknown[], slots?: string[]) => SwingSetCapData } */
function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

const maxVatsOnline = 2;
const steps = [
  {
    // After we deliver to...
    vat: 'target',
    // ... we expect these vats online:
    online: [
      { id: 'v3', name: 'bootstrap' },
      { id: 'v1', name: 'target' },
    ],
  },
  {
    vat: 'target2',
    online: [
      { id: 'v1', name: 'target' },
      { id: 'v4', name: 'target2' },
    ],
  },
  {
    vat: 'target3',
    online: [
      { id: 'v4', name: 'target2' },
      { id: 'v5', name: 'target3' },
    ],
  },
  {
    vat: 'target4',
    online: [
      { id: 'v5', name: 'target3' },
      { id: 'v6', name: 'target4' },
    ],
  },
  {
    vat: 'target2',
    online: [
      { id: 'v6', name: 'target4' },
      { id: 'v4', name: 'target2' },
    ],
  },
];

async function runSteps(c, t) {
  await c.run();
  for (const { vat, online } of steps) {
    t.log('sending to vat', vat);
    c.queueToVatRoot(vat, 'append', capargs([1]));
    // eslint-disable-next-line no-await-in-loop
    await c.run();
    t.log(
      'max:',
      maxVatsOnline,
      'expected online:',
      online.map(({ id, name }) => [id, name]),
    );
    t.deepEqual(
      c
        .getStatus()
        .activeVats.map(({ id, options: { name } }) => ({ id, name })),
      online,
    );
  }
}

test('4 vats in warehouse with 2 online', async t => {
  const c = await makeController('xs-worker', {
    warehousePolicy: { maxVatsOnline },
  });
  t.teardown(c.shutdown);

  await runSteps(c, t);
});

test('snapshot after deliveries', async t => {
  const snapstorePath = path.resolve(__dirname, './fixture-test-warehouse/');
  fs.mkdirSync(snapstorePath, { recursive: true });
  t.teardown(() => fs.rmdirSync(snapstorePath, { recursive: true }));

  const snapStore = makeSnapStore(snapstorePath, makeSnapStoreIO());
  const hostStorage = { snapStore, ...provideHostStorage() };
  const c = await makeController('xs-worker', {
    hostStorage,
    warehousePolicy: { maxVatsOnline, snapshotInterval: 1 },
  });
  t.teardown(c.shutdown);
  await runSteps(c, t);
});

test('LRU eviction', t => {
  const recent = makeLRU(3);
  const actual = [];
  for (const current of ['v0', 'v1', 'v2', 'v3', 'v3', 'v2']) {
    const evict = recent.add(current);
    t.log({ size: recent.size, current, evict });
    actual.push(evict);
  }
  t.deepEqual(actual, [null, null, null, 'v0', null, null]);
});
