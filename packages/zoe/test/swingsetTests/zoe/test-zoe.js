import '@agoric/install-ses';
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

async function main(withSES, argv) {
  const config = await loadBasedir(__dirname);
  await generateBundlesP;
  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const expectedAutomaticRefundOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateAutomaticRefund called',
  'The offer was accepted',
  'The offer was accepted',
  'bobMoolaPurse: balance {"brand":{},"extent":0}',
  'bobSimoleanPurse: balance {"brand":{},"extent":17}',
  'aliceMoolaPurse: balance {"brand":{},"extent":3}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":0}',
];

test('zoe - automaticRefund - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [3, 0, 0],
      [0, 17, 0],
    ];
    const dump = await main(true, ['automaticRefundOk', startingExtents]);
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
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'bobSimoleanPurse: balance {"brand":{},"extent":0}',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":7}',
];

test('zoe - coveredCall - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(true, ['coveredCallOk', startingExtents]);
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
  'daveMoolaPurse: balance {"brand":{},"extent":3}',
  'daveSimoleanPurse: balance {"brand":{},"extent":0}',
  'daveBucksPurse: balance {"brand":{},"extent":0}',
  'bobMoolaPurse: balance {"brand":{},"extent":0}',
  'bobSimoleanPurse: balance {"brand":{},"extent":0}',
  'bobBucksPurse;: balance {"brand":{},"extent":1}',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":7}',
];

test('zoe - swapForOption - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [3, 0, 0], // Alice starts with 3 moola
      [0, 0, 0], // Bob starts with nothing
      [0, 0, 0], // Carol starts with nothing
      [0, 7, 1], // Dave starts with 7 simoleans and 1 buck
    ];
    const dump = await main(true, ['swapForOptionOk', startingExtents]);
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
  'bobMoolaPurse: balance {"brand":{},"extent":1}',
  'carolMoolaPurse: balance {"brand":{},"extent":0}',
  'daveMoolaPurse: balance {"brand":{},"extent":0}',
  'bobSimoleanPurse: balance {"brand":{},"extent":4}',
  'carolSimoleanPurse: balance {"brand":{},"extent":7}',
  'daveSimoleanPurse: balance {"brand":{},"extent":5}',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":7}',
];
test('zoe - publicAuction - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [1, 0, 0],
      [0, 11, 0],
      [0, 7, 0],
      [0, 5, 0],
    ];
    const dump = await main(true, ['publicAuctionOk', startingExtents]);
    t.deepEquals(dump.log, expectedPublicAuctionOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedAtomicSwapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":7}',
  'bobSimoleanPurse: balance {"brand":{},"extent":0}',
];
test('zoe - atomicSwap - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(true, ['atomicSwapOk', startingExtents]);
    t.deepEquals(dump.log, expectedAtomicSwapOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSimpleExchangeOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'bobSimoleanPurse: balance {"brand":{},"extent":3}',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":4}',
];

test('zoe - simpleExchange - valid inputs - with SES', async t => {
  t.plan(1);
  try {
    const startingExtents = [
      [3, 0, 0],
      [0, 7, 0],
    ];
    const dump = await main(true, ['simpleExchangeOk', startingExtents]);
    t.deepEquals(dump.log, expectedSimpleExchangeOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const expectedSimpleExchangeNotificationLog = [
  '=> alice, bob, carol and dave are set up',
  '',
  '{"buys":[],"sells":[{"want":{"Price":{"brand":{},"extent":4}},"give":{"Asset":{"brand":{},"extent":3}}}]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  '{"buys":[],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"extent":0}',
  'bobSimoleanPurse: balance {"brand":{},"extent":20}',
  '{"buys":[{"want":{"Asset":{"brand":{},"extent":8}},"give":{"Price":{"brand":{},"extent":2}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'bobSimoleanPurse: balance {"brand":{},"extent":18}',
  '{"buys":[{"want":{"Asset":{"brand":{},"extent":8}},"give":{"Price":{"brand":{},"extent":2}}},{"want":{"Asset":{"brand":{},"extent":20}},"give":{"Price":{"brand":{},"extent":13}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'bobSimoleanPurse: balance {"brand":{},"extent":5}',
  '{"buys":[{"want":{"Asset":{"brand":{},"extent":8}},"give":{"Price":{"brand":{},"extent":2}}},{"want":{"Asset":{"brand":{},"extent":20}},"give":{"Price":{"brand":{},"extent":13}}},{"want":{"Asset":{"brand":{},"extent":5}},"give":{"Price":{"brand":{},"extent":2}}}],"sells":[]}',
  'The offer has been accepted. Once the contract has been completed, please check your payout',
  'bobMoolaPurse: balance {"brand":{},"extent":3}',
  'bobSimoleanPurse: balance {"brand":{},"extent":3}',
  'aliceMoolaPurse: balance {"brand":{},"extent":0}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":4}',
];

test('zoe - simpleExchange - state Update - with SES', async t => {
  t.plan(1);
  const startingExtents = [
    [3, 0, 0],
    [0, 24, 0],
  ];
  const dump = await main(true, ['simpleExchangeNotifier', startingExtents]);
  t.deepEquals(dump.log, expectedSimpleExchangeNotificationLog);
});

const expectedAutoswapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'Added liquidity.',
  'simoleanAmounts {"brand":{},"extent":1}',
  'Swap successfully completed.',
  'moolaAmounts {"brand":{},"extent":5}',
  'Swap successfully completed.',
  'bobMoolaPurse: balance {"brand":{},"extent":5}',
  'bobSimoleanPurse: balance {"brand":{},"extent":5}',
  'Liquidity successfully removed.',
  'poolAmounts{"TokenA":{"brand":{},"extent":0},"TokenB":{"brand":{},"extent":0},"Liquidity":{"brand":{},"extent":10}}',
  'aliceMoolaPurse: balance {"brand":{},"extent":8}',
  'aliceSimoleanPurse: balance {"brand":{},"extent":7}',
  'aliceLiquidityTokenPurse: balance {"brand":{},"extent":0}',
];
test('zoe - autoswap - valid inputs - with SES', async t => {
  t.plan(1);
  const startingExtents = [
    [10, 5, 0],
    [3, 7, 0],
  ];
  const dump = await main(true, ['autoswapOk', startingExtents]);
  t.deepEquals(dump.log, expectedAutoswapOkLog);
});

const expectedSellTicketsOkLog = [
  '=> alice, bob, carol and dave are set up',
  'availableTickets: {"brand":{},"extent":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":1},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":2},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":3}]}',
  'boughtTicketAmount: {"brand":{},"extent":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":1}]}',
  'after ticket1 purchased: {"brand":{},"extent":[{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":2},{"show":"Steven Universe, the Opera","start":"Wed, March 25th 2020 at 8pm","number":3}]}',
  'alice earned: {"brand":{},"extent":22}',
];
test('zoe - sellTickets - valid inputs', async t => {
  t.plan(1);
  const startingExtents = [
    [0, 0, 0],
    [22, 0, 0],
  ];
  const dump = await main(true, ['sellTicketsOk', startingExtents]);
  t.deepEquals(dump.log, expectedSellTicketsOkLog);
});
