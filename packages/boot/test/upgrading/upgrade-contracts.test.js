/* eslint-disable import/no-extraneous-dependencies */
/**
 * @file cribbed from
 *   packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { importSpec, makeScenario } from '@aglocal/boot/test/tools/scenario.js';

/**
 * @type {import('ava').TestFn<{}>}
 */
const test = anyTest;

test('upgrade mintHolder', async t => {
  const bundleName = 'mintHolder';

  const { EV } = await makeScenario({
    kernelConfigOverrides: {
      bundles: {
        agoricNames: {
          sourceSpec: await importSpec('@agoric/vats/src/vat-agoricNames.js'),
        },
        [bundleName]: {
          sourceSpec: await importSpec('@agoric/vats/src/mintHolder.js'),
        },
        zcf: {
          sourceSpec: await importSpec('@agoric/zoe/contractFacet.js'),
        },
      },
    },
    testContext: t,
    vats: {
      zoe: { sourceSpec: await importSpec('@agoric/vats/src/vat-zoe.js') },
    },
  });

  await EV.vat('bootstrap').buildZoe();

  const issuer = await EV.vat('bootstrap').startContract(
    bundleName,
    {},
    { keyword: 'A' },
  );
  const expectedBrand = await EV(issuer).getBrand();

  const incarnationNumber =
    await EV.vat('bootstrap').upgradeContract(bundleName);
  assert.equal(incarnationNumber, 1);

  const actualBrand = await EV(issuer).getBrand();
  assert.equal(expectedBrand, actualBrand);
});
