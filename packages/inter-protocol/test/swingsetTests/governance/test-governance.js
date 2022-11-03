import '@endo/init/debug.js';

import binaryVoteCounterBundle from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernorBundle from '@agoric/governance/bundles/bundle-contractGovernor.js';
import { buildKernelBundles, buildVatController } from '@agoric/swingset-vat';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import zcfBundle from '@agoric/zoe/bundles/bundle-contractFacet.js';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import anyTest from 'ava';

// import '../../../src/vaultFactory/vaultFactory.js';

const dirname = new URL('.', import.meta.url).pathname;

/** @type {import('ava').TestFn<{ data: { kernelBundles: any, config: any } }>} */
const test = anyTest;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  const contractBundles = {
    liquidateMinimum: await bundleCache.load(
      './src/vaultFactory/liquidateMinimum.js',
      'liquidateMinimum',
    ),
    amm: await bundleCache.load(
      './src/vpool-xyk-amm/multipoolMarketMaker.js',
      'amm',
    ),
    vaultFactory: await bundleCache.load(
      './src/vaultFactory/vaultFactory.js',
      'VaultFactory',
    ),
    committee: committeeBundle,
    contractGovernor: contractGovernorBundle,
    binaryVoteCounter: binaryVoteCounterBundle,
  };

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
  config.bundles = { zcf: { bundle: zcfBundle } };
  config.defaultManagerType = 'xs-worker';

  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = buildVatController(config, argv, { kernelBundles });
  t.teardown(() => E(controller).shutdown());
  await E(controller).run();
  return E(controller).dump();
}

// NB: yarn build if changing any of the contract bundles under test
// TODO(#5433) reinstate or convert to non-swingset test
test.skip('vaultFactory', async t => {
  const startingValues = [[100], [1000]]; // [aliceValues, ownerValues]
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, [
    '=> alice and the vaultFactory are set up',
    '=> voter and electorate vats are set up',
    'before vote, InterestRate numerator is 250',
    'Voter Bob cast a ballot for {"changes":{"InterestRate":{"denominator":{"brand":"[Alleged: IST brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}}',
    'Voter Carol cast a ballot for {"noChange":["InterestRate"]}',
    'Voter Dave cast a ballot for {"noChange":["InterestRate"]}',
    'Voter Emma cast a ballot for {"changes":{"InterestRate":{"denominator":{"brand":"[Alleged: IST brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}}',
    'Voter Flora cast a ballot for {"changes":{"InterestRate":{"denominator":{"brand":"[Alleged: IST brand]","value":"[10000n]"},"numerator":{"brand":"[Seen]","value":"[4321n]"}}}}',
    'governor from governed matches governor instance',
    '=> alice.oneLoanWithInterest called',
    'at 0 days: Alice owes {"brand":"[Alleged: IST brand]","value":"[510000n]"}',
    'at 1 days: Alice owes {"brand":"[Alleged: IST brand]","value":"[510035n]"}',
    'at 2 days: vote ready to close',
    'at 2 days: Alice owes {"brand":"[Alleged: IST brand]","value":"[510070n]"}',
    'after vote on (InterestRate), InterestRate numerator is 4321',
    'at 3 days: vote closed',
    'at 3 days: Alice owes {"brand":"[Alleged: IST brand]","value":"[510105n]"}',
    'at 3 days: 1 day after votes cast, assetNotifier update #7 has interestRate.numerator 250',
    'at 4 days: 2 days after votes cast, assetNotifier update #8 has interestRate.numerator 4321',
  ]);
});
