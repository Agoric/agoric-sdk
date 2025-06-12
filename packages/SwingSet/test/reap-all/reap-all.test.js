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

  const { activeVats } = c.getStatus();
  t.log(activeVats.map(({ id, options }) => `${id}: ${options.name}`));
  // As noted in kernel.js, the comms vat is not reapable.
  const reapable = activeVats.flatMap(({ id, options }) =>
    options.name === 'comms' ? [] : [id],
  );
  t.true(reapable.length >= 7); // bootstrap, staticDumbo{1,2,3}, dyn{1,2,3}
  // We care about the dynamic vats.
  const [dyn1, dyn2, dyn3] = reapable.slice(-3);

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

  // Create a chain of references

  /** @type {string[]} */
  const exportedPromises = [];
  exportedPromises.push(
    /** @type {string} */ (c.queueToVatRoot('bootstrap', 'getExport')),
  );

  for (let i = 0; i < 3; i += 1) {
    const lastExported = /** @type {string} */ (exportedPromises.at(-1));
    exportedPromises.push(
      /** @type {string} */ (
        c.queueToVatObject(dynamicRoots[i], 'makeHolder', [kslot(lastExported)])
      ),
    );
  }
  await c.run();

  // Drop our interest in the intermediary promises without gaining an interest
  // in their settlement
  for (const p of exportedPromises.splice(0, exportedPromises.length - 1)) {
    c.kpResolution(p, { incref: false });
  }

  // Workaround to trigger processRefcounts
  c.queueToVatObject(dynamicRoots.at(-1), 'doSomething', ['ping'], 'none');

  await c.run();
  checkQueues();

  const postMessagesReapPos = c.reapAllVats();
  checkQueues({ reap: reapable });

  await c.run();
  checkQueues();

  const postReapReapPos = c.reapAllVats(postMessagesReapPos);
  // Verify that if there is nothing to do, vat positions don't change through reapAll
  t.deepEqual(postReapReapPos, postMessagesReapPos);
  checkQueues();

  // Drop our interest in the last promise of the chain without gaining an
  // interest in its settlement
  c.kpResolution(exportedPromises.shift(), { incref: false });
  // Workaround to trigger processRefcounts, making sure we only add activity to the vat retiring an export
  c.queueToVatObject(dynamicRoots.at(-1), 'doSomething', ['ping'], 'none');
  await c.run();
  checkQueues();

  // Continuously trigger reapAllVats for vats that have seen deliveries,
  // asserting that for each round, the expected vat is reporting a reap.
  // Because of our chained references, our GC shakes lose an object for
  // each reap round.
  let prevReapPos = postMessagesReapPos;
  for (const vatID of [dyn3, dyn2, dyn1, c.vatNameToID('bootstrap')]) {
    const { [vatID]: prevVatPos, ...prevOtherPos } = prevReapPos;
    const newReapPos = c.reapAllVats(prevReapPos);
    checkQueues({ reap: [vatID] });
    const { [vatID]: newVatPos, ...newOtherPos } = newReapPos;
    t.log(`vat ${vatID} reap pos prev ${prevVatPos}, new ${newVatPos}`);
    t.deepEqual(newOtherPos, prevOtherPos);
    prevReapPos = newReapPos;
    await c.run();
    checkQueues();
  }

  // Once the root of the chain of reference is collected, doing more reaping
  // will not trigger any more activity.
  const finalReapPos = c.reapAllVats(prevReapPos);
  checkQueues();
  t.deepEqual(finalReapPos, prevReapPos);
});
