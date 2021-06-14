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
import contractGovernorBundle from '../../../bundles/bundle-contractGovernor';
import committeeRegistrarBundle from '../../../bundles/bundle-committeeRegistrar';
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

  const vatNames = ['alice', 'owner', 'priceAuthority', 'voter', 'zoe'];
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

  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = buildVatController(config, argv, { kernelBundles });
  await E(controller).run();
  return E(controller).dump();
}

const expectedTreasuryLog = [
  '=> voter and registrar vats are set up',
  '=> alice and the treasury are set up',
  'param values before {"PoolFee":{"name":"PoolFee","type":"nat","value":"[24n]"},"ProtocolFee":{"name":"ProtocolFee","type":"nat","value":"[6n]"}}',
  'Voter Bob cast a ballot for change PoolFee to "[37n]".',
  'Voter Carol cast a ballot for leave PoolFee unchanged.',
  'Voter Dave cast a ballot for leave PoolFee unchanged.',
  'Voter Emma cast a ballot for change PoolFee to "[37n]".',
  'Voter Flora cast a ballot for change PoolFee to "[37n]".',
  'governor from governed matches governor instance',
  'Param "PoolFee" is in the question',
  'registrar from governor matches',
  'Voter Bob cast a ballot for change InterestRate to {"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}.',
  'Voter Carol cast a ballot for leave InterestRate unchanged.',
  'Voter Dave cast a ballot for leave InterestRate unchanged.',
  'Voter Emma cast a ballot for change InterestRate to {"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}.',
  'Voter Flora cast a ballot for change InterestRate to {"denominator":{"brand":"[Alleged: RUN brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[500n]"}}.',
  '=> alice.oneLoanWithInterest called',
  'param values after vote (change PoolFee to "[37n]".) {"PoolFee":{"name":"PoolFee","type":"nat","value":"[37n]"},"ProtocolFee":{"name":"ProtocolFee","type":"nat","value":"[6n]"}}',
  'governor from governed matches governor instance',
  'Param "InterestRate" is in the question',
  'registrar from governor matches',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510000n]"} after borrowing',
  'Alice owes {"brand":"[Alleged: RUN brand]","value":"[510068n]"} after interest',
];

test.serial('treasury', async t => {
  const startingValues = [[100], [1000]];
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, expectedTreasuryLog);
});
