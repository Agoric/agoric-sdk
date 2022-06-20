// eslint-disable-next-line import/order
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { buildVatController } from '@agoric/swingset-vat';

const bfile = name => new URL(name, import.meta.url).pathname;

test('ertp service upgrade', async t => {
  const config = {
    // includeDevDependencies: true, // for vat-data
    defaultManagerType: 'local', // 'xs-worker',
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-ertp-service-upgrade.js') },
    },
    bundles: {
      ertpService: { sourceSpec: bfile('vat-ertp-service.js') },
    },
  };

  const c = await buildVatController(config);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    console.log(`${status}`);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // now perform the upgrade
  console.log(`-- starting upgradeV2`);

  const [v2status] = await run('upgradeV2', []);

  t.is(v2status, 'fulfilled');
});
