// @ts-nocheck
import test from 'ava';
import path from 'path';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@endo/bundle-source';
import zcfBundle from '../../../bundles/bundle-contractFacet.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  {
    contractPath: 'auction/index',
    bundleName: 'secondPriceAuction',
  },
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
  'otcDesk',
];

test.before(async t => {
  const start = Date.now();
  const kernelBundles = await buildKernelBundles();
  const step2 = Date.now();
  const contractBundles = {};
  const contractNames = [];
  await Promise.all(
    CONTRACT_FILES.map(async settings => {
      let bundleName;
      let contractPath;
      if (typeof settings === 'string') {
        bundleName = settings;
        contractPath = settings;
      } else {
        ({ bundleName, contractPath } = settings);
      }
      const source = `${dirname}/../../../src/contracts/${contractPath}.js`;
      const bundle = await bundleSource(source);
      contractBundles[bundleName] = { bundle };
      contractNames.push(bundleName);
    }),
  );
  const bundles = { zcf: { bundle: zcfBundle }, ...contractBundles };
  const step3 = Date.now();

  const vats = {};
  await Promise.all(
    ['alice', 'bob', 'carol', 'dave'].map(async name => {
      const source = `${dirname}/vat-${name}.js`;
      const bundle = await bundleSource(source);
      vats[name] = { bundle };
    }),
  );
  vats.zoe = {
    sourceSpec: `${dirname}/../../../../vats/src/vat-zoe.js`,
  };
  const bootstrapSource = `${dirname}/bootstrap.js`;
  vats.bootstrap = {
    bundle: await bundleSource(bootstrapSource),
    parameters: { contractNames }, // argv will be added to this
  };
  const config = { bootstrap: 'bootstrap', vats, bundles };
  config.defaultManagerType = 'xs-worker';
  config.relaxDurabilityRules = true;

  const step4 = Date.now();
  const ktime = `${(step2 - start) / 1000}s kernel`;
  const ctime = `${(step3 - step2) / 1000}s contracts`;
  const vtime = `${(step4 - step3) / 1000}s vats`;
  const ttime = `${(step4 - start) / 1000}s total`;
  console.log(`bundling: ${ktime}, ${ctime}, ${vtime}, ${ttime}`);

  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = await buildVatController(config, argv, { kernelBundles });
  t.teardown(controller.shutdown);
  await controller.run();
  return controller.dump();
}

const expectedAutomaticRefundOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateAutomaticRefund called',
  'The offer was accepted',
  'The offer was accepted',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":17}',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
];

test.serial('zoe - automaticRefund - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 17, 0],
  ];
  const dump = await main(t, ['automaticRefundOk', startingValues]);
  t.deepEqual(dump.log, expectedAutomaticRefundOkLog);
});

const expectedCoveredCallOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateCoveredCall called',
  '@@ schedule task for:1, currently: 0 @@',
  'The option was exercised. Please collect the assets in your payout.',
  'covered call was shut down due to "Swap completed."',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];

test.serial('zoe - coveredCall - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await main(t, ['coveredCallOk', startingValues]);
  t.deepEqual(dump.log, expectedCoveredCallOkLog);
});

const expectedSwapForOptionOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doSwapForOption called',
  'call option made',
  '@@ schedule task for:100, currently: 0 @@',
  'swap invitation made',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The option was exercised. Please collect the assets in your payout.',
  'daveMoolaPurse: balance {"brand":{},"value":3}',
  'daveSimoleanPurse: balance {"brand":{},"value":0}',
  'daveBucksPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
  'bobBucksPurse;: balance {"brand":{},"value":1}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];

test.serial('zoe - swapForOption - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0], // Alice starts with 3 moola
    [0, 0, 0], // Bob starts with nothing
    [0, 0, 0], // Carol starts with nothing
    [0, 7, 1], // Dave starts with 7 simoleans and 1 buck
  ];
  const dump = await main(t, ['swapForOptionOk', startingValues]);
  t.deepEqual(dump.log, expectedSwapForOptionOkLog);
});

const expectedSecondPriceAuctionOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Carol: The offer has been accepted. Once the contract has been completed, please check your payout',
  'Bob: The offer has been accepted. Once the contract has been completed, please check your payout',
  '@@ schedule task for:1, currently: 0 @@',
  'Dave: The offer has been accepted. Once the contract has been completed, please check your payout',
  '@@ tick:1 @@',
  'carolMoolaPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":1}',
  'daveMoolaPurse: balance {"brand":{},"value":0}',
  'carolSimoleanPurse: balance {"brand":{},"value":7}',
  'bobSimoleanPurse: balance {"brand":{},"value":4}',
  'daveSimoleanPurse: balance {"brand":{},"value":5}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];
test.serial('zoe - secondPriceAuction - valid inputs', async t => {
  const startingValues = [
    [1, 0, 0],
    [0, 11, 0],
    [0, 7, 0],
    [0, 5, 0],
  ];
  const dump = await main(t, ['secondPriceAuctionOk', startingValues]);
  t.deepEqual(dump.log, expectedSecondPriceAuctionOkLog);
});

const expectedAtomicSwapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
];
test.serial('zoe - atomicSwap - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await main(t, ['atomicSwapOk', startingValues]);
  t.deepEqual(dump.log, expectedAtomicSwapOkLog);
});

const expectedSimpleExchangeOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Order Added',
  'Order Added',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":3}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":4}',
];

test.serial('zoe - simpleExchange - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await main(t, ['simpleExchangeOk', startingValues]);
  t.deepEqual(dump.log, expectedSimpleExchangeOkLog);
});

const expectedSimpleExchangeNotificationLog = [
  '=> alice, bob, carol and dave are set up',
  '{"buys":[],"sells":[]}',
  '{"buys":[],"sells":[{"give":{"Asset":{"brand":{},"value":3}},"want":{"Price":{"brand":{},"value":4}}}]}',
  'Order Added',
  '{"buys":[],"sells":[]}',
  'Order Added',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":20}',
  '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}}],"sells":[]}',
  'Order Added',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":18}',
  '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}},{"give":{"Price":{"brand":{},"value":13}},"want":{"Asset":{"brand":{},"value":20}}}],"sells":[]}',
  'Order Added',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":5}',
  '{"buys":[{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":8}}},{"give":{"Price":{"brand":{},"value":13}},"want":{"Asset":{"brand":{},"value":20}}},{"give":{"Price":{"brand":{},"value":2}},"want":{"Asset":{"brand":{},"value":5}}}],"sells":[]}',
  'Order Added',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":3}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":4}',
];

test.serial('zoe - simpleExchange - state Update', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 24, 0],
  ];
  const dump = await main(t, ['simpleExchangeNotifier', startingValues]);
  t.deepEqual(dump.log, expectedSimpleExchangeNotificationLog);
});

const expectedAutoswapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Added liquidity.',
  'simoleanAmounts {"brand":{},"value":1}',
  'Swap successfully completed.',
  'moola proceeds {"brand":{},"value":5}',
  'Swap successfully completed.',
  'bobMoolaPurse: balance {"brand":{},"value":5}',
  'bobSimoleanPurse: balance {"brand":{},"value":5}',
  'simoleans required {"brand":{},"value":5}',
  'Liquidity successfully removed.',
  'poolAmounts{"Central":{"brand":{},"value":0},"Liquidity":{"brand":{},"value":10},"Secondary":{"brand":{},"value":0}}',
  'aliceMoolaPurse: balance {"brand":{},"value":8}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
  'aliceLiquidityTokenPurse: balance {"brand":{},"value":0}',
];
test.serial('zoe - autoswap - valid inputs', async t => {
  const startingValues = [
    [10, 5, 0],
    [3, 7, 0],
  ];
  const dump = await main(t, ['autoswapOk', startingValues]);
  t.deepEqual(dump.log, expectedAutoswapOkLog);
});

const expectedSellTicketsOkLog = [
  '=> alice, bob, carol and dave are set up',
  'availableTickets: {"brand":{},"value":[{"number":3,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":2,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":1,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
  'boughtTicketAmount: {"brand":{},"value":[{"number":1,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
  'after ticket1 purchased: {"brand":{},"value":[{"number":3,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"},{"number":2,"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm"}]}',
  'alice earned: {"brand":{},"value":22}',
];
test.serial('zoe - sellTickets - valid inputs', async t => {
  const startingValues = [
    [0, 0, 0],
    [22, 0, 0],
  ];
  const dump = await main(t, ['sellTicketsOk', startingValues]);
  t.deepEqual(dump.log, expectedSellTicketsOkLog);
});

const expectedOTCDeskOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Inventory added',
  '@@ schedule task for:1, currently: 0 @@',
  'The option was exercised. Please collect the assets in your payout.',
  '{"brand":{},"value":3}',
  '{"brand":{},"value":0}',
  'Inventory removed',
  '{"brand":{},"value":2}',
];
test('zoe - otcDesk - valid inputs', async t => {
  const startingValues = [
    [10000, 10000, 10000],
    [10000, 10000, 10000],
  ];
  const dump = await main(t, ['otcDeskOk', startingValues]);
  t.deepEqual(dump.log, expectedOTCDeskOkLog);
});

const expectedBadTimerLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doBadTimer called',
  'is a zoe invitation: true',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
];

// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - bad timer', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 0, 0],
  ];
  const dump = await main(t, ['badTimer', startingValues]);
  t.deepEqual(dump.log, expectedBadTimerLog);
});
