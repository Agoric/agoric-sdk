// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test('zcf-ish upgrade', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'local', // 'xs-worker',
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

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [v1status, _v1capdata] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // now perform the upgrade
  console.log(`-- starting upgradeV2`);

  const [v2status, _v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
});
