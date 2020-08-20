// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-metering-and-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  {
    contractPath: 'auction/secondPriceAuction',
    bundleName: 'secondPriceAuction',
  },
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async settings => {
    let bundleName;
    let contractPath;
    if (typeof settings === 'string') {
      bundleName = settings;
      contractPath = settings;
    } else {
      ({ bundleName, contractPath } = settings);
    }
    const bundle = await bundleSource(
      `${__dirname}/../../../src/contracts/${contractPath}`,
    );
    const obj = { bundle, contractPath };
    fs.writeFileSync(
      `${__dirname}/bundle-${bundleName}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(argv) {
  const config = await loadBasedir(__dirname);
  await generateBundlesP;
  const controller = await buildVatController(config, argv);
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

test('zoe - automaticRefund - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [3, 0, 0],
      [0, 17, 0],
    ];
    const dump = await main(['automaticRefundOk', startingValues]);
    t.deepEquals(dump.log, expectedAutomaticRefundOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedCoveredCallOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateCoveredCall called',
  '@@ schedule task for:1, currently: 0 @@',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];

test('zoe - coveredCall - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(['coveredCallOk', startingValues]);
    t.deepEquals(dump.log, expectedCoveredCallOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSwapForOptionOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doSwapForOption called',
  'call option made',
  '@@ schedule task for:100, currently: 0 @@',
  'swap invitation made',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'daveMoolaPurse: balance {"brand":{},"value":3}',
  'daveSimoleanPurse: balance {"brand":{},"value":0}',
  'daveBucksPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
  'bobBucksPurse;: balance {"brand":{},"value":1}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];

test('zoe - swapForOption - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [3, 0, 0], // Alice starts with 3 moola
      [0, 0, 0], // Bob starts with nothing
      [0, 0, 0], // Carol starts with nothing
      [0, 7, 1], // Dave starts with 7 simoleans and 1 buck
    ];
    const dump = await main(['swapForOptionOk', startingValues]);
    t.deepEquals(dump.log, expectedSwapForOptionOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSecondPriceAuctionOkLog = [
  '=> alice, bob, carol and dave are set up',
  '@@ schedule task for:1, currently: 0 @@',
  'Carol: The offer has been accepted. Once the contract has been completed, please check your payout',
  'Bob: The offer has been accepted. Once the contract has been completed, please check your payout',
  'Dave: The offer has been accepted. Once the contract has been completed, please check your payout',
  '@@ tick:1 @@',
  '&& running a task scheduled for 1. &&',
  'carolMoolaPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":1}',
  'daveMoolaPurse: balance {"brand":{},"value":0}',
  'carolSimoleanPurse: balance {"brand":{},"value":7}',
  'bobSimoleanPurse: balance {"brand":{},"value":4}',
  'daveSimoleanPurse: balance {"brand":{},"value":5}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];
test('zoe - secondPriceAuction - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [1, 0, 0],
      [0, 11, 0],
      [0, 7, 0],
      [0, 5, 0],
    ];
    const dump = await main(['secondPriceAuctionOk', startingValues]);
    t.deepEquals(dump.log, expectedSecondPriceAuctionOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedAtomicSwapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
  'bobSimoleanPurse: balance {"brand":{},"value":0}',
];
test('zoe - atomicSwap - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(['atomicSwapOk', startingValues]);
    t.deepEquals(dump.log, expectedAtomicSwapOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSimpleExchangeOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Trade Successful',
  'Trade Successful',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":3}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":4}',
];

test('zoe - simpleExchange - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(['simpleExchangeOk', startingValues]);
    t.deepEquals(dump.log, expectedSimpleExchangeOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSimpleExchangeNotificationLog = [
  '=> alice, bob, carol and dave are set up',
  '{"buys":[],"sells":[]}',
  '{"buys":[],"sells":[{"want":{"Price":{"brand":{},"value":4}},"give":{"Asset":{"brand":{},"value":3}}}]}',
  'Trade Successful',
  '{"buys":[],"sells":[]}',
  'Trade Successful',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":20}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}}],"sells":[]}',
  'Trade Successful',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":18}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}},{"want":{"Asset":{"brand":{},"value":20}},"give":{"Price":{"brand":{},"value":13}}}],"sells":[]}',
  'Trade Successful',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":5}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}},{"want":{"Asset":{"brand":{},"value":20}},"give":{"Price":{"brand":{},"value":13}}},{"want":{"Asset":{"brand":{},"value":5}},"give":{"Price":{"brand":{},"value":2}}}],"sells":[]}',
  'Trade Successful',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":3}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":4}',
];

test('zoe - simpleExchange - state Update', async t => {
  t.plan(1);
  const startingValues = [
    [3, 0, 0],
    [0, 24, 0],
  ];
  const dump = await main(['simpleExchangeNotifier', startingValues]);
  t.deepEquals(dump.log, expectedSimpleExchangeNotificationLog);
});

const expectedAutoswapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Added liquidity.',
  'simoleanAmounts {"brand":{},"value":1}',
  'Swap successfully completed.',
  'moolaAmounts {"brand":{},"value":5}',
  'Swap successfully completed.',
  'bobMoolaPurse: balance {"brand":{},"value":5}',
  'bobSimoleanPurse: balance {"brand":{},"value":5}',
  'Liquidity successfully removed.',
  'poolAmounts{"Liquidity":{"brand":{},"value":10},"TokenA":{"brand":{},"value":0},"TokenB":{"brand":{},"value":0}}',
  'aliceMoolaPurse: balance {"brand":{},"value":8}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
  'aliceLiquidityTokenPurse: balance {"brand":{},"value":0}',
];
test('zoe - autoswap - valid inputs', async t => {
  t.plan(1);
  const startingValues = [
    [10, 5, 0],
    [3, 7, 0],
  ];
  const dump = await main(['autoswapOk', startingValues]);
  t.deepEquals(dump.log, expectedAutoswapOkLog);
});

const expectedSellTicketsOkLog = [
  '=> alice, bob, carol and dave are set up',
  'availableTickets: {"brand":{},"value":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":1},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":2},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":3}]}',
  'boughtTicketAmount: {"brand":{},"value":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":1}]}',
  'after ticket1 purchased: {"brand":{},"value":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":2},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":3}]}',
  'alice earned: {"brand":{},"value":22}',
];
test('zoe - sellTickets - valid inputs', async t => {
  t.plan(1);
  const startingValues = [
    [0, 0, 0],
    [22, 0, 0],
  ];
  const dump = await main(['sellTicketsOk', startingValues]);
  t.deepEquals(dump.log, expectedSellTicketsOkLog);
});

const expectedBadTimerLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doBadTimer called',
  'is a zoe invitation: true',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
];
test('zoe - bad timer', async t => {
  t.plan(1);
  const startingValues = [
    [3, 0, 0],
    [0, 0, 0],
  ];
  const dump = await main(['badTimer', startingValues]);
  t.deepEquals(dump.log, expectedBadTimerLog);
});
