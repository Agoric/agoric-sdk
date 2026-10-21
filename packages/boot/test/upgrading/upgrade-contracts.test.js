/**
 * @file cribbed from
 *   packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import {
  forkScenario,
  makeBootControllerFixture,
} from '../tools/controller-fixture.js';

/**
 * @import {TestFn} from 'ava';
 * @import {ControllerFixture} from '../tools/controller-fixture.js';
 */

/**
 * @typedef {ControllerFixture} TestContext
 */

/**
 * @type {TestFn<TestContext>}
 */
const test = anyTest;

let baseContextP;
const getBaseContext = () => {
  if (!baseContextP) {
    baseContextP = makeBootControllerFixture({
      testModuleUrl: import.meta.url,
      bootstrapSourceSpec: './bootstrap.js',
      vats: {
        zoe: '@agoric/vats/src/vat-zoe.js',
      },
      bundles: {
        zcf: '@agoric/zoe/contractFacet.js',
        mintHolder: '@agoric/vats/src/mintHolder.js',
      },
    });
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
