import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { buildVatController } from '@agoric/swingset-vat';

const bfile = name => new URL(name, import.meta.url).pathname;

test('coveredCall service upgrade', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    // includeDevDependencies: true, // for vat-data
    /** @type {ManagerType} */
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: {
        // TODO refactor to use bootstrap-relay.js
        sourceSpec: bfile('bootstrap-coveredCall-service-upgrade.js'),
      },
      zoe: { sourceSpec: bfile('../../../../vats/src/vat-zoe.js') },
      ertp: { sourceSpec: bfile('./vat-ertp-service.js') },
    },
    bundles: {
      zcf: { sourceSpec: bfile('../../../src/contractFacet/vatRoot.js') },
      coveredCallV2: {
        sourceSpec: bfile('../../../src/contracts/coveredCall-durable.js'),
      },
      coveredCallV3: { sourceSpec: bfile('coveredCall-durable-V3.js') },
    },
  };

  const c = await buildVatController(config);
  t.teardown(c.shutdown);
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
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // now perform the upgrade
  console.log(`-- starting upgradeV2`);

  const [v2status] = await run('upgradeV2', []);

  t.is(v2status, 'fulfilled');
});
