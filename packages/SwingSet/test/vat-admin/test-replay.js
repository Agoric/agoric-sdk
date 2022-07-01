// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { getAllState, setAllState } from '@agoric/swing-store';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { buildKernelBundles, buildVatController } from '../../src/index.js';
import { capargs } from '../util.js';

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
  };

  // XXX TODO: also copy and check transcripts
  const hostStorage1 = provideHostStorage();
  {
    const c1 = await buildVatController(copy(config), [], {
      hostStorage: hostStorage1,
      kernelBundles: t.context.data.kernelBundles,
    });
    t.teardown(c1.shutdown);
    c1.pinVatRoot('bootstrap');
    const r1 = c1.queueToVatRoot('bootstrap', 'createVat', [], 'panic');
    await c1.run();
    t.deepEqual(c1.kpResolution(r1), capargs('created'));
  }

  // Now we abandon that swingset and start a new one, with the same state.
  // we could re-use the Storage object, but I'll be paranoid and create a
  // new one.

  const state1 = getAllState(hostStorage1);
  const hostStorage2 = provideHostStorage();
  setAllState(hostStorage2, state1);
  {
    const c2 = await buildVatController(copy(config), [], {
      hostStorage: hostStorage2,
    });
    t.teardown(c2.shutdown);
    const r2 = c2.queueToVatRoot('bootstrap', 'check', [], 'panic');
    await c2.run();
    t.deepEqual(c2.kpResolution(r2), capargs('ok'));
  }
});
