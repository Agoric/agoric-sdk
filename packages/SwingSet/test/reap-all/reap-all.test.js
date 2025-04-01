// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/kmarshal';

import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

test('reap all vats', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    defaultManagerType: 'local',
    defaultReapInterval: 4,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-reap-all.js') },
      staticDumbo1: { bundleName: 'dumbo' },
      staticDumbo2: { bundleName: 'dumbo' },
      staticDumbo3: { bundleName: 'dumbo' },
    },
    bundles: {
      dumbo: { sourceSpec: bfile('vat-dumbo.js') },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.pinVatRoot('staticDumbo1');
  c.pinVatRoot('staticDumbo2');
  c.pinVatRoot('staticDumbo3');
  await c.run();

  const kpid = c.queueToVatRoot('bootstrap', 'createDynamicVats');
  await c.run();

  const dynamicRoots = kunser(c.kpResolution(kpid));
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < i + 1; j += 1) {
      c.queueToVatRoot(
        `staticDumbo${i + 1}`,
        'doSomething',
        [`staticDumbo${i + 1} #${j + 1}`],
        'none',
      );
    }
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < i + 1; j += 1) {
      c.queueToVatObject(
        dynamicRoots[i],
        'doSomething',
        [`dynamicDumbo${i + 1} #${j + 1}`],
        'none',
      );
    }
  }
  // Note: no call to c.run() here, so all the above messages are still enqueued

  const { activeVats } = c.getStatus();
  t.log(activeVats.map(({ id, options }) => `${id}: ${options.name}`));
  const reapable = activeVats.map(({ id }) => id);
  t.true(reapable.length >= 7); // bootstrap, staticDumbo{1,2,3}, dyn{1,2,3}

  /**
   * @param {{ reap?: string[], acceptanceLength?: number, runLength?: number }} [expectations]
   */
  const checkQueues = (expectations = {}) => {
    const { reap = [], acceptanceLength = 0, runLength = 0 } = expectations;
    const dump = c.dump();
    t.is(dump.acceptanceQueue.length, acceptanceLength);
    t.is(dump.runQueue.length, runLength);
    t.is(dump.reapQueue.length, reap.length);
    t.deepEqual(new Set(dump.reapQueue), new Set(reap));
  };

  checkQueues({ acceptanceLength: 12 });

  c.reapAllVats();
  checkQueues({ reap: reapable, acceptanceLength: 12 });

  await c.run();
  checkQueues();
});
