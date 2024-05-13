// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { kser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { bundleOpts } from '../util.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

async function run(c, method, args = []) {
  assert(Array.isArray(args));
  const kpid = c.queueToVatRoot('bootstrap', method, args);
  await c.run();
  const status = c.kpStatus(kpid);
  const result = c.kpResolution(kpid);
  return [status, result];
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test('replay after upgrade', async t => {
  const config = {
    bootstrap: 'bootstrap',
    defaultManagerType: 'xsnap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-upgrade-replay.js') },
    },
    bundles: {
      upton: { sourceSpec: bfile('vat-upton-replay.js') },
    },
  };
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);

  const ss1 = initSwingStore();
  {
    await initializeSwingset(copy(config), [], ss1.kernelStorage, initOpts);
    const c1 = await makeSwingsetController(ss1.kernelStorage, {}, runtimeOpts);
    t.teardown(c1.shutdown);
    c1.pinVatRoot('bootstrap');
    await c1.run();

    // create initial version
    const [v1status, v1data] = await run(c1, 'buildV1');
    t.is(v1status, 'fulfilled');
    t.deepEqual(v1data, kser(1));

    // now perform the upgrade
    const [v2status, v2data] = await run(c1, 'upgradeV2');
    t.is(v2status, 'fulfilled');
    // upgrade restart loses RAM state, hence adding 20 yields 20 rather than 21
    t.deepEqual(v2data, kser(20));
  }

  // copy the store just to be sure
  const serialized = ss1.debug.serialize();
  const ss2 = initSwingStore(null, { serialized });
  {
    const c2 = await makeSwingsetController(ss2.kernelStorage, {}, runtimeOpts);
    t.teardown(c2.shutdown);
    c2.pinVatRoot('bootstrap');
    await c2.run();

    // do something after replay that says we're still alive
    const [rstatus, rdata] = await run(c2, 'checkReplay');
    t.is(rstatus, 'fulfilled');

    // replay retains RAM state of post-upgrade vat, hence adding 300 yields 320
    t.deepEqual(rdata, kser(320));
  }
});
