import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import path from 'path';
import fs from 'fs';
import bundleSource from '@agoric/bundle-source';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  'publicAuction',
  'publicSwap',
  'simpleExchange',
];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const { source, moduleFormat } = await bundleSource(
      `${__dirname}/../../../core/zoe/contracts/${contract}`,
    );
    const obj = { source, moduleFormat, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(withSES, basedir, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];
  await generateBundlesP;
  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const expectedAutomaticRefundOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateAutomaticRefund called',
  '{"offerDesc":[{"rule":"offerExactly","assetDesc":{"label":{"assay":{},"description":"moola"},"extent":3}},{"rule":"wantExactly","assetDesc":{"label":{"assay":{},"description":"simoleans"},"extent":7}}],"exit":{"kind":"onDemand"}}',
  '{"offerDesc":[{"rule":"wantExactly","assetDesc":{"label":{"assay":{},"description":"moola"},"extent":15}},{"rule":"offerExactly","assetDesc":{"label":{"assay":{},"description":"simoleans"},"extent":17}}],"exit":{"kind":"onDemand"}}',
  'bobMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'bobSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":17}',
  'aliceMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":3}',
  'aliceSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":0}',
];

test('zoe - automaticRefund - valid inputs - with SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 17]];
    const dump = await main(true, 'zoe', [
      'automaticRefundOk',
      'automaticRefund',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedAutomaticRefundOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - automaticRefund - valid inputs - no SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 17]];
    const dump = await main(false, 'zoe', [
      'automaticRefundOk',
      'automaticRefund',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedAutomaticRefundOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

const expectedCoveredCallOkLog = [
  '=> alice, bob, carol and dave are set up',
  '=> alice.doCreateCoveredCall called',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'bobMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":3}',
  'bobSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":0}',
  'aliceMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'aliceSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":7}',
];

test('zoe - coveredCall - valid inputs - with SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7]];
    const dump = await main(true, 'zoe', [
      'coveredCallOk',
      'coveredCall',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedCoveredCallOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - coveredCall - valid inputs - no SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7]];
    const dump = await main(false, 'zoe', [
      'coveredCallOk',
      'coveredCall',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedCoveredCallOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

const expectedPublicAuctionOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'bobMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":1}',
  'carolMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'daveMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'bobSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":4}',
  'carolSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":7}',
  'daveSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":5}',
  'aliceMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'aliceSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":7}',
];

test('zoe - publicAuction - valid inputs - with SES', async t => {
  try {
    const startingExtents = [[1, 0], [0, 11], [0, 7], [0, 5]];
    const dump = await main(true, 'zoe', [
      'publicAuctionOk',
      'publicAuction',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedPublicAuctionOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - publicAuction - valid inputs - no SES', async t => {
  try {
    const startingExtents = [[1, 0], [0, 11], [0, 7], [0, 5]];
    const dump = await main(false, 'zoe', [
      'publicAuctionOk',
      'publicAuction',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedPublicAuctionOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

const expectedPublicSwapOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'bobMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":3}',
  'bobSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":0}',
  'carolMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'carolSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":7}',
];
test('zoe - publicSwap - valid inputs - with SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7], [0, 0]];
    const dump = await main(true, 'zoe', [
      'publicSwapOk',
      'publicSwap',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedPublicSwapOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - publicSwap - valid inputs - no SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7], [0, 0]];
    const dump = await main(false, 'zoe', [
      'publicSwapOk',
      'publicSwap',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedPublicSwapOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

const expectedSimpleExchangeOkLog = [
  '=> alice, bob, carol and dave are set up',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'The offer has been accepted. Once the contract has been completed, please check your winnings',
  'bobMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":3}',
  'bobSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":0}',
  'aliceMoolaPurse: balance {"label":{"assay":{},"description":"moola"},"extent":0}',
  'aliceSimoleanPurse;: balance {"label":{"assay":{},"description":"simoleans"},"extent":7}',
];
test('zoe - simpleExchange - valid inputs - with SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7]];
    const dump = await main(true, 'zoe', [
      'simpleExchangeOk',
      'simpleExchange',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedSimpleExchangeOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - simpleExchange - valid inputs - no SES', async t => {
  try {
    const startingExtents = [[3, 0], [0, 7]];
    const dump = await main(false, 'zoe', [
      'simpleExchangeOk',
      'simpleExchange',
      startingExtents,
    ]);
    t.deepEquals(dump.log, expectedSimpleExchangeOkLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
