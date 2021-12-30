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
  'param values before {"ChargingPeriod":{"type":"nat","value":"[86400n]"},"InitialMargin":{"type":"ratio","value":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[100n]"},"numerator":{"brand":"[Seen]","value":"[120n]"}}},"InterestRate":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[250n]"}}},"LiquidationMargin":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[100n]"},"numerator":{"brand":"[Seen]","value":"[105n]"}}},"LoanFee":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[200n]"}}},"RecordingPeriod":{"type":"nat","value":"[86400n]"}}',
  'Voter Bob cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  'Voter Carol cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"}}',
  'Voter Dave cast a ballot for {"noChange":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"}}',
  'Voter Emma cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  'Voter Flora cast a ballot for {"changeParam":{"collateralBrand":"[Alleged: moola brand]","parameterName":"InterestRate"},"proposedValue":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}}',
  '=> alice.oneLoanWithInterest called',
  'param values after vote on (InterestRate) {"ChargingPeriod":{"type":"nat","value":"[86400n]"},"InitialMargin":{"type":"ratio","value":{"denominator":{"brand":"[Alleged: RUN brand]","value":"[100n]"},"numerator":{"brand":"[Seen]","value":"[120n]"}}},"InterestRate":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}},"LiquidationMargin":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[100n]"},"numerator":{"brand":"[Seen]","value":"[105n]"}}},"LoanFee":{"type":"ratio","value":{"denominator":{"brand":"[Seen]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[200n]"}}},"RecordingPeriod":{"type":"nat","value":"[86400n]"}}',
  'governor from governed matches governor instance',
  'Param "InterestRate" is in the question',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"} after borrowing',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510069n]"} after interest',
];

test.serial('vaultFactory', async t => {
  const startingValues = [[100], [1000]];
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedVaultFactoryLog);
});
