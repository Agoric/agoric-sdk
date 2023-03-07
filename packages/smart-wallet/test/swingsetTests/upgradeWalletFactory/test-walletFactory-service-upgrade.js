import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assert } from '@agoric/assert';
import { buildVatController } from '@agoric/swingset-vat';
import {
  wfV1BundleName,
  wfV2BundleName,
} from './bootstrap-walletFactory-service-upgrade.js';

// so paths can be expresssed relative to this file and made absolute
const bfile = name => new URL(name, import.meta.url).pathname;

test('walletFactory service upgrade', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    defaultManagerType: 'local',
    bundleCachePath: 'bundles/',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        // TODO refactor to use bootstrap-relay.js
        sourceSpec: bfile('bootstrap-walletFactory-service-upgrade.js'),
      },
      zoe: { sourceSpec: bfile('../../../../vats/src/vat-zoe.js') },
    },
    bundles: {
      zcf: {
        sourceSpec: bfile('../../../../zoe/src/contractFacet/vatRoot.js'),
      },
      [wfV1BundleName]: {
        sourceSpec: bfile('../../../src/walletFactory.js'),
      },
      [wfV2BundleName]: { sourceSpec: bfile('walletFactory-V2.js') },
    },
  };

  t.log('buildVatController');
  const c = await buildVatController(config);
  c.pinVatRoot('bootstrap');
  t.log('run controller');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  t.log('create initial version');
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  t.log('perform null upgrade');
  const [null1status] = await run('nullUpgradeV1', []);
  t.is(null1status, 'fulfilled');

  t.log('now perform the V2 upgrade');
  const [v2status] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
});
