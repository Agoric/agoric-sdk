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
      c.queueToVatRoot(`staticDumbo${i + 1}`, 'doSomething', [
        `staticDumbo${i + 1} #${j + 1}`,
      ]);
    }
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < i + 1; j += 1) {
      c.queueToVatObject(dynamicRoots[i], 'doSomething', [
        `dynamicDumbo${i + 1} #${j + 1}`,
      ]);
    }
  }
  // Note: no call to c.run() here, so all the above messages are still enqueued

  const dumpBefore = c.dump();
  t.is(dumpBefore.acceptanceQueue.length, 12);
  t.is(dumpBefore.reapQueue.length, 0);
  t.is(dumpBefore.runQueue.length, 0);

  c.reapAllVats();
  const dumpPreReap = c.dump();
  t.is(dumpPreReap.acceptanceQueue.length, 12);
  t.is(dumpPreReap.reapQueue.length, 11);
  t.is(dumpBefore.runQueue.length, 0);
  // prettier-ignore
  const reapQueueReference =
    new Set(['v1', 'v3', 'v6', 'v7', 'v8', 'v5', 'v2', 'v4', 'v9', 'v10', 'v11'])
  const reapQueueActual = new Set(dumpPreReap.reapQueue);
  t.deepEqual(reapQueueActual, reapQueueReference);

  await c.run();
  const dumpPostReap = c.dump();
  t.is(dumpPostReap.acceptanceQueue.length, 0);
  t.is(dumpPostReap.reapQueue.length, 0);
  t.is(dumpBefore.runQueue.length, 0);

  t.pass();
});
