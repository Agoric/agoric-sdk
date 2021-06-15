/* global __dirname */
// @ts-check

import { test } from '../../tools/prepare-test-env-ava.js';

import { loadBasedir, buildVatController } from '../../src/index.js';

async function makeController(managerType, maxVatsOnline) {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType, enableDisavow: true };
  config.vats.target2 = config.vats.target;
  config.vats.target3 = config.vats.target;
  config.vats.target4 = config.vats.target;
  const warehousePolicy = { maxVatsOnline };
  const c = await buildVatController(config, [], { warehousePolicy });
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
      { id: 'v2', name: 'bootstrap' },
      { id: 'v1', name: 'target' },
    ],
  },
  {
    vat: 'target2',
    online: [
      { id: 'v1', name: 'target' },
      { id: 'v3', name: 'target2' },
    ],
  },
  {
    vat: 'target3',
    online: [
      { id: 'v3', name: 'target2' },
      { id: 'v4', name: 'target3' },
    ],
  },
  {
    vat: 'target4',
    online: [
      { id: 'v4', name: 'target3' },
      { id: 'v5', name: 'target4' },
    ],
  },
];

test('4 vats in warehouse with 2 online', async t => {
  const c = await makeController('xs-worker', maxVatsOnline);
  t.teardown(c.shutdown);

  await c.run();
  for (const { vat, online } of steps) {
    t.log('sending to vat', vat);
    c.queueToVatExport(vat, 'o+0', 'append', capargs([1]));
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
});
