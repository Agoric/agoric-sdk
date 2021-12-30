// @ts-check

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import rawTest from 'ava';
import path from 'path';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import liquidateBundle from '../../../../bundles/bundle-liquidateMinimum.js';
import ammBundle from '../../../../bundles/bundle-amm.js';
import vaultFactoryBundle from '../../../../bundles/bundle-vaultFactory.js';
import committeeBundle from '../../../../bundles/bundle-committee.js';
import contractGovernorBundle from '../../../../bundles/bundle-contractGovernor.js';
import binaryVoteCounterBundle from '../../../../bundles/bundle-binaryVoteCounter.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

/** @type {import('ava').TestInterface<{ data: { kernelBundles: any, config: any } }>} */
const test = rawTest;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();

  const nameToBundle = [
    ['liquidateMinimum', liquidateBundle],
    ['amm', ammBundle],
    ['vaultFactory', vaultFactoryBundle],
    ['committee', committeeBundle],
    ['contractGovernor', contractGovernorBundle],
    ['binaryVoteCounter', binaryVoteCounterBundle],
  ];
  const contractBundles = {};
  nameToBundle.forEach(([name, bundle]) => {
    contractBundles[name] = bundle;
  });

  const vatNames = ['alice', 'zoe', 'priceAuthority', 'owner'];
  const vatNameToSource = vatNames.map(name => {
    const source = `${dirname}/vat-${name}.js`;
    return [name, source];
  });
  const bootstrapSource = `${dirname}/bootstrap.js`;
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

const expectedVaultFactoryLog = [
  '=> alice and the vaultFactory are set up',
  '=> alice.oneLoanWithInterest called',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"} after borrowing',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510035n]"} after interest',
];

test.serial('vaultFactory', async t => {
  const startingValues = [[100], [1000]];
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedVaultFactoryLog);
});
