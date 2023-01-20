// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';

import {
  buildVatController,
  loadSwingsetConfigFile,
  buildKernelBundles,
} from '../../../src/index.js';
import { kser } from '../../../src/lib/kmarshal.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test.serial('replay does not resurrect dead vat', async t => {
  const configPath = new URL('swingset-no-zombies.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);

  const ss1 = initSwingStore();
  {
    const c1 = await buildVatController(config, [], {
      kernelStorage: ss1.kernelStorage,
      kernelBundles: t.context.data.kernelBundles,
    });
    await c1.run();
    t.deepEqual(c1.kpResolution(c1.bootstrapResult), kser('bootstrap done'));
    // this comes from the dynamic vat...
    t.deepEqual(c1.dump().log, [`w: I ate'nt dead`]);
  }

  const serialized = ss1.debug.serialize();
  const ss2 = initSwingStore(null, { serialized });
  {
    const c2 = await buildVatController(config, [], {
      kernelStorage: ss2.kernelStorage,
      kernelBundles: t.context.data.kernelBundles,
    });
    await c2.run();
    // ...which shouldn't run the second time through
    t.deepEqual(c2.dump().log, []);
  }
});
