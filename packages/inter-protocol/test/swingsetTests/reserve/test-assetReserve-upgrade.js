import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assert } from '@agoric/assert';

import { buildVatController } from '@agoric/swingset-vat';
import { pkgAbsPath } from '@agoric/swingset-vat/tools/paths.js';
import { arV1BundleName } from './bootstrap-assetReserve-upgrade.js';

// so paths can be expresssed relative to this file and made absolute
const bfile = name => new URL(name, import.meta.url).pathname;

test('assetReserve service upgrade', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // test's bootstrap has some deps not needed in production
    bundleCachePath: 'bundles/',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        // TODO refactor to use bootstrap-relay.js
        sourceSpec: bfile('bootstrap-assetReserve-upgrade.js'),
      },
      zoe: {
        sourceSpec: pkgAbsPath('@agoric/vats/src/vat-zoe.js'),
      },
    },
    bundles: {
      zcf: {
        sourceSpec: pkgAbsPath('@agoric/zoe/src/contractFacet/vatRoot.js'),
      },
      committee: {
        sourceSpec: pkgAbsPath('@agoric/governance/src/committee.js'),
      },
      puppetContractGovernor: {
        sourceSpec: pkgAbsPath(
          '@agoric/governance/tools/puppetContractGovernor.js',
        ),
      },
      [arV1BundleName]: {
        sourceSpec: pkgAbsPath(
          '@agoric/inter-protocol/src/reserve/assetReserve.js',
        ),
      },
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
  const [buildV1] = await run('buildV1', []);
  t.is(buildV1, 'fulfilled');

  t.log('smoke test of functionality');
  const [testFunctionality1] = await run('testFunctionality1', []);
  t.is(testFunctionality1, 'fulfilled');

  t.log('perform null upgrade');
  const [nullUpgradeV1] = await run('nullUpgradeV1', []);
  t.is(nullUpgradeV1, 'fulfilled');

  t.log('smoke test of functionality');
  const [testFunctionality2] = await run('testFunctionality2', []);
  t.is(testFunctionality2, 'fulfilled');
});
