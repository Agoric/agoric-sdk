/* global __dirname */

// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@agoric/bundle-source';

import liquidateBundle from '../../bundles/bundle-liquidateMinimum';
import autoswapBundle from '../../bundles/bundle-multipoolAutoswap';
import stablecoinBundle from '../../bundles/bundle-stablecoinMachine';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();

  const vats = {};
  await Promise.all(
    ['alice', 'zoe', 'priceAuthority', 'owner'].map(async name => {
      const source = `${__dirname}/vat-${name}.js`;
      const bundle = await bundleSource(source);
      vats[name] = { bundle };
    }),
  );

  const nameToBundle = [
    ['liquidateMinimum', liquidateBundle],
    ['autoswap', autoswapBundle],
    ['treasury', stablecoinBundle],
  ];
  const contractBundles = {};
  await Promise.all(
    nameToBundle.map(async ([name, bundle]) => {
      contractBundles[name] = bundle;
    }),
  );

  const bootstrapSource = `${__dirname}/bootstrap.js`;
  vats.bootstrap = {
    bundle: await bundleSource(bootstrapSource),
    parameters: { contractBundles }, // argv will be added to this
  };
  const config = { bootstrap: 'bootstrap', vats };

  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = await buildVatController(config, argv, { kernelBundles });
  await controller.run();
  return controller.dump();
}

const expectedTreasuryLog = [
  '=> alice and the treasury are set up',
  '=> alice.oneLoanWithInterest called',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"} after borrowing',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510034n]"} after interest',
];

test.serial('treasury', async t => {
  const startingValues = [[100], [1000]];
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedTreasuryLog);
});
