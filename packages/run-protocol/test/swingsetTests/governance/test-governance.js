// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@endo/init';
// eslint-disable-next-line import/no-extraneous-dependencies
import rawTest from 'ava';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import path from 'path';
import zcfBundle from '@agoric/zoe/bundles/bundle-contractFacet.js';
import {
  governanceBundles,
  economyBundles,
} from '../../../src/importedBundles.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

/** @type {import('ava').TestInterface<{ data: { kernelBundles: any, config: any } }>} */
// @ts-expect-error cast
const test = rawTest;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();

  const contractBundles = {
    liquidateMinimum: economyBundles.liquidate,
    amm: economyBundles.amm,
    vaultFactory: economyBundles.VaultFactory,
    committee: governanceBundles.committee,
    contractGovernor: governanceBundles.contractGovernor,
    binaryVoteCounter: governanceBundles.binaryVoteCounter,
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
  await E(controller).run();
  return E(controller).dump();
}

// NB: yarn build if changing any of the contract bundles under test
test.serial('vaultFactory', async t => {
  const startingValues = [[100], [1000]]; // [aliceValues, ownerValues]
  const dump = await main(t, ['oneLoanWithInterest', startingValues]);
  t.deepEqual(dump.log, [
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
    'at 3 days: 1 day after votes cast, assetNotifier update #6 has interestRate.numerator 250',
    'at 4 days: 2 days after votes cast, assetNotifier update #7 has interestRate.numerator 4321',
  ]);
});
