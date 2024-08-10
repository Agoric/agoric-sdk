// @ts-check

import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';
import { makeLRU } from '../../src/kernel/vat-warehouse.js';

async function makeController(managerType, runtimeOptions, snapshotInterval) {
  const bpath = new URL('bootstrap.js', import.meta.url).pathname;
  const tpath = new URL('vat-target.js', import.meta.url).pathname;
  const config = {
    snapshotInterval,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: bpath,
      },
      target: {
        creationOptions: { managerType },
        sourceSpec: tpath,
      },
    },
  };

  config.vats.target2 = config.vats.target;
  config.vats.target3 = config.vats.target;
  config.vats.target4 = config.vats.target;
  const c = await buildVatController(config, [], runtimeOptions);
  c.pinVatRoot('bootstrap');
  return c;
}

const maxVatsOnline = 2;
const steps = [
  {
    // After we deliver to...
    vat: 'target',
    // ... we expect these vats online:
    online: [
      { id: 'v1', name: 'bootstrap' },
      { id: 'v6', name: 'target' },
    ],
  },
  {
    vat: 'target2',
    online: [
      { id: 'v6', name: 'target' },
      { id: 'v7', name: 'target2' },
    ],
  },
  {
    vat: 'target3',
    online: [
      { id: 'v7', name: 'target2' },
      { id: 'v8', name: 'target3' },
    ],
  },
  {
    vat: 'target4',
    online: [
      { id: 'v8', name: 'target3' },
      { id: 'v9', name: 'target4' },
    ],
  },
  {
    vat: 'target2',
    online: [
      { id: 'v9', name: 'target4' },
      { id: 'v7', name: 'target2' },
    ],
  },
];

async function runSteps(c, t) {
  await c.run();
  for (const { vat, online } of steps) {
    t.log('sending to vat', vat);
    c.queueToVatRoot(vat, 'append', [1]);
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
