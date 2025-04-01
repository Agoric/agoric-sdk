// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { initSwingStore } from '@agoric/swing-store';
import { kslot, kunser } from '@agoric/kmarshal';

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

  // prettier-ignore
  const allVats =
    harden(['v1', 'v6', 'v7', 'v8', 'v5', 'v2', 'v4', 'v9', 'v10', 'v11']);

  const checkQueues = (reapQueue, acceptanceLength = 0, runLength = 0) => {
    const expectedReapQueueSet = new Set(reapQueue);
    const dump = c.dump();
    t.is(dump.acceptanceQueue.length, acceptanceLength);
    t.is(dump.runQueue.length, runLength);
    t.is(dump.reapQueue.length, expectedReapQueueSet.size);
    const reapQueueActual = new Set(dump.reapQueue);
    t.deepEqual(reapQueueActual, expectedReapQueueSet);
  };

  checkQueues([], 12);

  c.reapAllVats();
  checkQueues(allVats, 12);

  await c.run();
  checkQueues([]);

  // Create a chain of references

  /** @type {string[]} */
  const exportedPromises = [];
  exportedPromises.push(
    /** @type {string} */ (c.queueToVatRoot('bootstrap', 'getExport')),
  );

  for (let i = 0; i < 3; i += 1) {
    const lastExported = exportedPromises.slice(-1)[0];
    exportedPromises.push(
      /** @type {string} */ (
        c.queueToVatObject(dynamicRoots[i], 'makeHolder', [kslot(lastExported)])
      ),
    );
  }
  await c.run();

  // Drop our interest in the intermediary promises without gaining an interest in their resolution
  for (const p of exportedPromises.splice(0, exportedPromises.length - 1)) {
    c.kpResolution(p, { incref: false });
  }

  // Workaround to trigger processRefcounts
  c.queueToVatObject(
    dynamicRoots.slice(-1)[0],
    'doSomething',
    ['ping'],
    'none',
  );

  await c.run();
  checkQueues([]);

  const postMessagesReapPos = c.reapAllVats();
  checkQueues(allVats);

  await c.run();
  checkQueues([]);

  const postReapReapPos = c.reapAllVats(postMessagesReapPos);
  // Verify that if there is nothing to do, vat positions don't change through reapAll
  t.deepEqual(postReapReapPos, postMessagesReapPos);
  checkQueues([]);

  // Drop our interest in the last promise of the chain, dropping the refcount onto its resolution
  c.kpResolution(exportedPromises.splice(0, 1)[0], { incref: false });
  // Workaround to trigger processRefcounts, making sure we only add activity to the vat retiring an export
  c.queueToVatObject(
    dynamicRoots.slice(-1)[0],
    'doSomething',
    ['ping'],
    'none',
  );
  await c.run();
  checkQueues([]);

  // Continuously trigger reapAllVats for vats that have seen deliveries,
  // asserting that for each round, the expected vat is reporting a reap.
  // Because of our chained references, our GC shakes lose an object for
  // each reap round.
  let prevReapPos = postMessagesReapPos;
  for (const vat of ['v11', 'v10', 'v9', 'v1']) {
    const newReapPos = c.reapAllVats(prevReapPos);
    checkQueues([vat]);
    const { [vat]: prevVatPos, ...prevOtherPos } = prevReapPos;
    const { [vat]: newVatPos, ...newOtherPos } = newReapPos;
    t.log(`vat ${vat} prev reap pos ${prevVatPos}, new reap pos ${newVatPos}`);
    t.deepEqual(newOtherPos, prevOtherPos);
    prevReapPos = newReapPos;
    await c.run();
    checkQueues([]);
  }

  // Once the root of the chain of reference is collected, doing more reaping
  // will not trigger any more activity.
  const finalReapPos = c.reapAllVats(prevReapPos);
  checkQueues([]);
  t.deepEqual(finalReapPos, prevReapPos);
});
