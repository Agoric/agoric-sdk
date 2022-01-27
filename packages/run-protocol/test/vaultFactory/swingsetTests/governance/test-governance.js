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
import path from 'path';

import liquidateBundle from '../../../../bundles/bundle-liquidateMinimum.js';
import ammBundle from '../../../../bundles/bundle-amm.js';
import vaultFactoryBundle from '../../../../bundles/bundle-vaultFactory.js';
import contractGovernorBundle from '../../../../bundles/bundle-contractGovernor.js';
import committeeBundle from '../../../../bundles/bundle-committee.js';
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

  const vatNames = ['alice', 'owner', 'priceAuthority', 'voter', 'zoe'];
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
  '=> voter and electorate vats are set up',
  'before vote, InterestRate numerator is 250',
  'Voter Bob cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}',
  'Voter Carol cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"}}',
  'Voter Dave cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"}}',
  'Voter Emma cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}',
  'Voter Flora cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}',
  '=> alice.oneLoanWithInterest called',
  'governor from governed matches governor instance',
  'Param "InterestRate" is in the question',
  'at 0 days: Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"}',
  'at 1 days: Alice owes {"brand":"[Alleged: RUN brand]","value":"[510035n]"}',
  'at 2 days: vote ready to close',
  'at 2 days: Alice owes {"brand":"[Alleged: RUN brand]","value":"[510070n]"}',
  'after vote on (InterestRate), InterestRate numerator is 4321',
  'at 3 days: vote closed',
  'at 3 days: Alice owes {"brand":"[Alleged: RUN brand]","value":"[510105n]"}',
  'at 3 days: 1 day after votes cast, uiNotifier update #4 has interestRate.numerator 250',
  'at 4 days: 2 days after votes cast, uiNotifier update #5 has interestRate.numerator 4321',
  'at 4 days: Alice owes {"brand":"[Alleged: RUN brand]","value":"[510608n]"}',
];

// NB: yarn build if changing any of the contract bundles under test
test.serial('vaultFactory', async t => {
  const startingValues = [[100], [1000]]; // [aliceValues, ownerValues]
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedVaultFactoryLog);
});
