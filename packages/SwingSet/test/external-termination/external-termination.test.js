// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { initSwingStore } from '@agoric/swing-store';
import { kser, kunser } from '@agoric/kmarshal';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

const bfile = name => new URL(name, import.meta.url).pathname;

const testExternalTermination = async (t, defaultManagerType) => {
  /** @type {SwingSetConfig} */
  const config = {
    defaultManagerType,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('./bootstrap-external-termination.js') },
    },
    bundles: {
      doomed: { sourceSpec: bfile('./vat-doomed.js') },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const getVatIDs = () => c.dump().vatTables.map(vt => vt.vatID);

  // vat-doomed should now be running. We casually assume the new vat
  // has the last ID
  const vatIDs = getVatIDs();
  const vatID = vatIDs[vatIDs.length - 1];

  {
    const kpid = c.queueToVatRoot('bootstrap', 'ping', [1]);
    await c.run();
    t.is(kunser(c.kpResolution(kpid)), 1);
  }
  {
    const kpid = c.queueToVatRoot('bootstrap', 'getExitVal');
    await c.run();
    t.is(kunser(c.kpResolution(kpid)), undefined);
  }

  // The "vat has been terminated" flags are set synchronously during
  // c.terminateVat(), as well as all the vat's promises being
  // rejected. The deletion of state happens during the first cleanup
  // crank, which (since we aren't limiting it with a runPolicy)
  // cleans to completion during this c.run()

  c.terminateVat(vatID, kser('doom!'));
  await c.run();

  t.false(getVatIDs().includes(vatID));

  {
    // this provokes noise: liveslots logs one RemoteError
    const kpid = c.queueToVatRoot('bootstrap', 'ping', [1]);
    await c.run();
    t.is(c.kpStatus(kpid), 'rejected');
    t.deepEqual(kunser(c.kpResolution(kpid)), Error('vat terminated'));
  }

  {
    const kpid = c.queueToVatRoot('bootstrap', 'getExitVal');
    await c.run();
    t.deepEqual(kunser(c.kpResolution(kpid)), ['reject', 'doom!']);
  }
};

test('external termination: local worker', async t => {
  await testExternalTermination(t, 'local');
});

test('external termination: xsnap worker', async t => {
  await testExternalTermination(t, 'xsnap');
});
