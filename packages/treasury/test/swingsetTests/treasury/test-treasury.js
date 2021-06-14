/* global __dirname */

// @ts-check

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import rawTest from 'ava';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import liquidateBundle from '../../../bundles/bundle-liquidateMinimum';
import autoswapBundle from '../../../bundles/bundle-multipoolAutoswap';
import stablecoinBundle from '../../../bundles/bundle-stablecoinMachine';
import committeeRegistrarBundle from '../../../bundles/bundle-committeeRegistrar';
import contractGovernorBundle from '../../../bundles/bundle-contractGovernor';
import binaryBallotCounterBundle from '../../../bundles/bundle-binaryBallotCounter';

/** @type {import('ava').TestInterface<{ data: { kernelBundles: any, config: any } }>} */
const test = rawTest;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();

  const nameToBundle = [
    ['liquidateMinimum', liquidateBundle],
    ['autoswap', autoswapBundle],
    ['treasury', stablecoinBundle],
    ['committeeRegistrar', committeeRegistrarBundle],
    ['contractGovernor', contractGovernorBundle],
    ['binaryBallotCounter', binaryBallotCounterBundle],
  ];
  const contractBundles = {};
  nameToBundle.forEach(([name, bundle]) => {
    contractBundles[name] = bundle;
  });

  const vatNames = ['alice', 'zoe', 'priceAuthority', 'owner'];
  const vatNameToSource = vatNames.map(name => {
    const source = `${__dirname}/vat-${name}.js`;
    return [name, source];
  });
  const bootstrapSource = `${__dirname}/bootstrap.js`;
  vatNameToSource.push(['bootstrap', bootstrapSource]);

  const bundles = await Promise.all(
    vatNameToSource.map(([_, source]) => bundleSource(source)),
  );
  const vats = {};
  [...vatNames, 'bootstrap'].forEach(
    (name, index) => (vats[name] = { bundle: bundles[index] }),
  );

  vats.bootstrap.parameters = { contractBundles };

  const config = { bootstrap: 'bootstrap', vats };
  config.defaultManagerType = 'xs-worker';

  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = buildVatController(config, argv, { kernelBundles });
  await E(controller).run();
  return E(controller).dump();
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
