// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test('zcf-ish upgrade', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'local',
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-zcf-ish-upgrade.js') },
    },
    bundles: {
      zcf: { sourceSpec: bfile('pseudo-zcf.js') },
      contractV1: { sourceSpec: bfile('pseudo-contract-v1.js') },
      contractV2: { sourceSpec: bfile('pseudo-contract-v2.js') },
    },
  };

  const { kernelStorage, hostStorage } = initSwingStore();
  t.teardown(hostStorage.close);
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [v1status, _v1capdata] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // now perform the upgrade
  console.log(`-- starting upgradeV2`);

  const [v2status, _v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
});
