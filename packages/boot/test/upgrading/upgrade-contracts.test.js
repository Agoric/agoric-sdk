/**
 * @file cribbed from
 *   packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import {
  forkScenario,
  makeControllerFixture,
} from '../tools/controller-fixture.js';

/**
 * @import {TestFn} from 'ava';
 * @import {ControllerFixture} from '../tools/controller-fixture.js';
 * @import {SwingSetConfig} from '@agoric/swingset-vat';
 */

/**
 * @typedef {ControllerFixture} TestContext
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
    baseContextP = makeBaseConfig().then(config =>
      makeControllerFixture({ config }),
    );
  }
  return baseContextP;
};

test.before(async t => {
  t.context = await getBaseContext();
});

test('upgrade mintHolder', async t => {
  const { controller: c } = await forkScenario(t);

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
