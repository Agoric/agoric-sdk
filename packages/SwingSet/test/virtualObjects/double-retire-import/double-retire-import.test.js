import { test } from '../../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import {
  initializeSwingset,
  makeSwingsetController,
} from '../../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

async function testUpgrade(t, defaultManagerType) {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-dri.js') },
    },
    bundles: {
      dri: { sourceSpec: bfile('vat-dri.js') },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const kpid = c.queueToVatRoot('bootstrap', 'build', []);
  await c.run();
  t.is(c.kpStatus(kpid), 'fulfilled');
  // the bug manifests as a fatal vat error (illegal syscall), causing
  // vat-dri to be killed before it can respond to the ping, causing
  // bootstrap~.build() to reject.
}

test('double retire import - local', async t => {
  return testUpgrade(t, 'local');
});

test('double retire import - xsnap', async t => {
  return testUpgrade(t, 'xs-worker');
});
