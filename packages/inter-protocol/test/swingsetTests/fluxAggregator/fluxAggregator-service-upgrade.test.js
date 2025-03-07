import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { buildVatController } from '@agoric/swingset-vat';
import { faV1BundleName } from './bootstrap-fluxAggregator-service-upgrade.js';

// so paths can be expresssed relative to this file and made absolute
const bfile = name => new URL(name, import.meta.url).pathname;
const resolvePathname = spec =>
  new URL(importMetaResolve(spec, import.meta.url)).pathname;

test('fluxAggregator service upgrade', async t => {
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // test's bootstrap has some deps not needed in production
    bundleCachePath: 'bundles/',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        // TODO refactor to use bootstrap-relay.js
        sourceSpec: bfile('bootstrap-fluxAggregator-service-upgrade.js'),
      },
      zoe: {
        sourceSpec: resolvePathname('@agoric/vats/src/vat-zoe.js'),
      },
    },
    bundles: {
      zcf: {
        sourceSpec: resolvePathname('@agoric/zoe/src/contractFacet/vatRoot.js'),
      },
      committee: {
        sourceSpec: resolvePathname('@agoric/governance/src/committee.js'),
      },
      puppetContractGovernor: {
        sourceSpec: resolvePathname(
          '@agoric/governance/tools/puppetContractGovernor.js',
        ),
      },
      [faV1BundleName]: {
        sourceSpec: resolvePathname(
          '@agoric/inter-protocol/src/price/fluxAggregatorContract.js',
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
