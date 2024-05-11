// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { kser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { buildKernelBundles, buildVatController } from '../../src/index.js';

function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test.serial('replay dynamic vat', async t => {
  const config = {
    vats: {
      bootstrap: {
        sourceSpec: new URL('replay-bootstrap.js', import.meta.url).pathname,
        parameters: { dynamicBundleName: 'dynamic' },
      },
    },
    bundles: {
      dynamic: {
        sourceSpec: new URL('replay-dynamic.js', import.meta.url).pathname,
      },
    },
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
  };

  const ss1 = initSwingStore();
  {
    const c1 = await buildVatController(copy(config), [], {
      kernelStorage: ss1.kernelStorage,
      kernelBundles: t.context.data.kernelBundles,
    });
    t.teardown(c1.shutdown);
    c1.pinVatRoot('bootstrap');
    const r1 = c1.queueToVatRoot('bootstrap', 'createVat', [], 'panic');
    await c1.run();
    t.deepEqual(c1.kpResolution(r1), kser('created'));
  }

  // Now we abandon that swingset and start a new one, with the same state.
  // we could re-use the Storage object, but I'll be paranoid and create a
  // new one.

  const serialized = ss1.debug.serialize();
  const ss2 = initSwingStore(null, { serialized });
  {
    const c2 = await buildVatController(copy(config), [], {
      kernelStorage: ss2.kernelStorage,
    });
    t.teardown(c2.shutdown);
    const r2 = c2.queueToVatRoot('bootstrap', 'check', [], 'panic');
    await c2.run();
    t.deepEqual(c2.kpResolution(r2), kser('ok'));
  }
});
