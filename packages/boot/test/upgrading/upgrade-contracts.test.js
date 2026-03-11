/**
 * @file cribbed from
 *   packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { initSwingStore } from '@agoric/swing-store';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { buildVatController } from '@agoric/swingset-vat';

/**
 * @import {TestFn} from 'ava';
 * @import {SwingSetConfig} from '@agoric/swingset-vat';
 */

/**
 * @typedef {{
 *   forkController: () => Promise<{
 *     controller: Awaited<ReturnType<typeof buildVatController>>;
 *     shutdown: () => Promise<void>;
 *   }>;
 * }} TestContext
 */

/**
 * @type {TestFn<TestContext>}
 */
const test = anyTest;

const bfile = name => new URL(name, import.meta.url).pathname;
const importSpec = async spec =>
  new URL(importMetaResolve(spec, import.meta.url)).pathname;

const makeBaseConfig = async () =>
  harden({
    bootstrap: 'bootstrap',
    vats: {
      // TODO refactor to use bootstrap-relay.js
      bootstrap: { sourceSpec: bfile('./bootstrap.js') },
      zoe: { sourceSpec: await importSpec('@agoric/vats/src/vat-zoe.js') },
    },
    bundles: {
      zcf: {
        sourceSpec: await importSpec('@agoric/zoe/contractFacet.js'),
      },
      mintHolder: {
        sourceSpec: await importSpec('@agoric/vats/src/mintHolder.js'),
      },
    },
  });

let baseContextP;
const getBaseContext = () => {
  if (!baseContextP) {
    baseContextP = (async () => {
      const config = await makeBaseConfig();
      const swingStore = initSwingStore();
      const controller = await buildVatController(config, undefined, {
        kernelStorage: swingStore.kernelStorage,
      });
      try {
        controller.pinVatRoot('bootstrap');
        await controller.run();
        const serialized = swingStore.debug.serialize();
        return {
          forkController: async () => {
            const forkStore = initSwingStore(null, { serialized });
            const forkController = await buildVatController(config, undefined, {
              kernelStorage: forkStore.kernelStorage,
            });
            forkController.pinVatRoot('bootstrap');
            await forkController.run();
            return {
              controller: forkController,
              shutdown: async () => {
                await forkController.shutdown();
                await forkStore.hostStorage.close();
              },
            };
          },
        };
      } finally {
        await controller.shutdown();
        await swingStore.hostStorage.close();
      }
    })();
  }
  return baseContextP;
};

test.before(async t => {
  t.context = await getBaseContext();
});

test('upgrade mintHolder', async t => {
  const { controller: c, shutdown } = await t.context.forkController();
  t.teardown(shutdown);
  c.pinVatRoot('bootstrap');

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
