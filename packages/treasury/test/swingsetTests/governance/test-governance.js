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

import liquidateBundle from '../../../bundles/bundle-liquidateMinimum.js';
import autoswapBundle from '../../../bundles/bundle-multipoolAutoswap.js';
import stablecoinBundle from '../../../bundles/bundle-stablecoinMachine.js';
import contractGovernorBundle from '../../../bundles/bundle-contractGovernor.js';
import committeeBundle from '../../../bundles/bundle-committee.js';
import binaryVoteCounterBundle from '../../../bundles/bundle-binaryVoteCounter.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

/** @type {import('ava').TestInterface<{ data: { kernelBundles: any, config: any } }>} */
const test = rawTest;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();

  const nameToBundle = [
    ['liquidateMinimum', liquidateBundle],
    ['autoswap', autoswapBundle],
    ['treasury', stablecoinBundle],
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

const expectedTreasuryLog = [
  '=> voter and electorate vats are set up',
  '=> alice and the treasury are set up',
  'param values before {"PoolFee":{"name":"PoolFee","type":"nat","value":"[24n]"},"ProtocolFee":{"name":"ProtocolFee","type":"nat","value":"[6n]"}}',
  'Voter Bob cast a ballot for {"changeParam":{"key":"fee","parameterName":"PoolFee"},"proposedValue":"[37n]"}',
  'Voter Carol cast a ballot for {"noChange":{"key":"fee","parameterName":"PoolFee"}}',
  'Voter Dave cast a ballot for {"noChange":{"key":"fee","parameterName":"PoolFee"}}',
  'Voter Emma cast a ballot for {"changeParam":{"key":"fee","parameterName":"PoolFee"},"proposedValue":"[37n]"}',
  'Voter Flora cast a ballot for {"changeParam":{"key":"fee","parameterName":"PoolFee"},"proposedValue":"[37n]"}',
  'governor from governed matches governor instance',
  'Param "PoolFee" is in the question',
  'Voter Bob cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","key":"pool","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  'Voter Carol cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","key":"pool","parameterName":"InterestRate"}}',
  'Voter Dave cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","key":"pool","parameterName":"InterestRate"}}',
  'Voter Emma cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","key":"pool","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  'Voter Flora cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","key":"pool","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  '=> alice.oneLoanWithInterest called',
  'param values after vote on (PoolFee) {"PoolFee":{"name":"PoolFee","type":"nat","value":"[37n]"},"ProtocolFee":{"name":"ProtocolFee","type":"nat","value":"[6n]"}}',
  'governor from governed matches governor instance',
  'Param "InterestRate" is in the question',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"} after borrowing',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510068n]"} after interest',
];

test.serial('treasury', async t => {
  const startingValues = [[100], [1000]];
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedTreasuryLog);
});
