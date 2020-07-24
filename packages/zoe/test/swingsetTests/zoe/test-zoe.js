import '@agoric/install-metering-and-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  'publicAuction',
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const bundle = await bundleSource(
      `${__dirname}/../../../src/contracts/${contract}`,
    );
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
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
  '@@ schedule task for:100, currently: 0 @@',
  'call option made',
  'swap invite made',
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

const expectedPublicAuctionOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"value":1}',
  'carolMoolaPurse: balance {"brand":{},"value":0}',
  'daveMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":4}',
  'carolSimoleanPurse: balance {"brand":{},"value":7}',
  'daveSimoleanPurse: balance {"brand":{},"value":5}',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":7}',
];
test('zoe - publicAuction - valid inputs', async t => {
  t.plan(1);
  try {
    const startingValues = [
      [1, 0, 0],
      [0, 11, 0],
      [0, 7, 0],
      [0, 5, 0],
    ];
    const dump = await main(['publicAuctionOk', startingValues]);
    t.deepEquals(dump.log, expectedPublicAuctionOkLog);
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
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
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
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  '{"buys":[],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"value":0}',
  'bobSimoleanPurse: balance {"brand":{},"value":20}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":18}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}},{"want":{"Asset":{"brand":{},"value":20}},"give":{"Price":{"brand":{},"value":13}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"value":3}',
  'bobSimoleanPurse: balance {"brand":{},"value":5}',
  '{"buys":[{"want":{"Asset":{"brand":{},"value":8}},"give":{"Price":{"brand":{},"value":2}}},{"want":{"Asset":{"brand":{},"value":20}},"give":{"Price":{"brand":{},"value":13}}},{"want":{"Asset":{"brand":{},"value":5}},"give":{"Price":{"brand":{},"value":2}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
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
  'poolAmounts{"TokenA":{"brand":{},"value":0},"TokenB":{"brand":{},"value":0},"Liquidity":{"brand":{},"value":10}}',
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
