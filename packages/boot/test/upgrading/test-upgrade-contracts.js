/**
 * @file cribbed from
 *   packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeResolvePath } from '@agoric/swingset-vat/tools/paths.js';
import { buildVatController } from '@agoric/swingset-vat';

/**
 * @type {import('ava').TestFn<{}>}
 */
const test = anyTest;

const resolvePath = makeResolvePath(import.meta.url);

test('upgrade mintHolder', async t => {
  /** @type {SwingSetConfig} */
  const config = harden({
    bootstrap: 'bootstrap',
    vats: {
      // TODO refactor to use bootstrap-relay.js
      bootstrap: { sourceSpec: resolvePath('./bootstrap.js') },
      zoe: { sourceSpec: resolvePath('@agoric/vats/src/vat-zoe.js') },
    },
    bundles: {
      zcf: {
        sourceSpec: resolvePath('@agoric/zoe/contractFacet.js'),
      },
      mintHolder: {
        sourceSpec: resolvePath('@agoric/vats/src/mintHolder.js'),
      },
    },
  });
  // console.debug('config', JSON.stringify(config, null, 2));

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

  t.log('create initial version');
  const [v1status] = await run('startV1', []);
  t.is(v1status, 'fulfilled');

  t.log('now perform the upgrade');
  const [v2status] = await run('upgradeV1', []);
  t.is(v2status, 'fulfilled');
});
