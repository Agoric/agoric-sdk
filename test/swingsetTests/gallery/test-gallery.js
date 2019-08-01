import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import path from 'path';

async function main(withSES, basedir, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const expectedTapFaucetLog = [
  '=> setup called',
  'starting tapFaucet',
  'alice is made',
  'starting testTapFaucet',
  '++ alice.doTapFaucet starting',
  'pixel from faucet balance {"label":{"issuer":{},"description":"pixels"},"quantity":[{"x":1,"y":4}]}',
];

test('run gallery demo tapFaucet with SES', async t => {
  const dump = await main(true, 'gallery', ['tapFaucet']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});

test('run gallery demo tapFaucet without SES', async t => {
  const dump = await main(false, 'gallery', ['tapFaucet']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});

const expectedAliceChangesColorLog = [
  '=> setup called',
  'starting aliceChangesColor',
  'alice is made',
  'starting testAliceChangesColor',
  '++ alice.doChangeColor starting',
  'tapped Faucet',
  'current color #000000',
  'pixel index is 100 of 100',
];

test('run gallery demo aliceChangesColor with SES', async t => {
  const dump = await main(true, 'gallery', ['aliceChangesColor']);
  t.deepEquals(dump.log, expectedAliceChangesColorLog);
  t.end();
});

test('run gallery demo aliceChangesColor without SES', async t => {
  const dump = await main(false, 'gallery', ['aliceChangesColor']);
  t.deepEquals(dump.log, expectedAliceChangesColorLog);
  t.end();
});

const expectedAliceSendsOnlyUseRightLog = [
  '=> setup called',
  'starting aliceSendsOnlyUseRight',
  'alice is made',
  'starting testAliceSendsOnlyUseRight',
  '++ alice.doOnlySendUseRight starting',
  'tapped Faucet',
  'pixel x:1, y:4 has original color #a903be',
  '++ bob.receiveUseRight starting',
  "pixel x:1, y:4 changed to bob's color #B695C0",
  "pixel x:1, y:4 changed to alice's color #9FBF95",
  'bob was unable to color: Error: no use rights present',
];

test('run gallery demo aliceSendsOnlyUseRight with SES', async t => {
  const dump = await main(true, 'gallery', ['aliceSendsOnlyUseRight']);
  t.deepEquals(dump.log, expectedAliceSendsOnlyUseRightLog);
  t.end();
});

test('run gallery demo aliceSendsOnlyUseRight without SES', async t => {
  const dump = await main(false, 'gallery', ['aliceSendsOnlyUseRight']);
  t.deepEquals(dump.log, expectedAliceSendsOnlyUseRightLog);
  t.end();
});

const expectedGalleryRevokesLog = [
  '=> setup called',
  'starting galleryRevokes',
  'starting testGalleryRevokes',
  '++ alice.doTapFaucetAndStore starting',
  '++ alice.checkAfterRevoked starting',
  'amount quantity should be an array of length 0: 0',
  'successfully threw Error: no use rights present',
];

test('run gallery demo galleryRevokes with SES', async t => {
  const dump = await main(true, 'gallery', ['galleryRevokes']);
  t.deepEquals(dump.log, expectedGalleryRevokesLog);
  t.end();
});

test('run gallery demo galleryRevokes without SES', async t => {
  const dump = await main(false, 'gallery', ['galleryRevokes']);
  t.deepEquals(dump.log, expectedGalleryRevokesLog);
  t.end();
});

const expectedAliceSellsAndBuysLog = [
  '=> setup called',
  'starting aliceSellsAndBuys',
  'starting testAliceSellsAndBuys',
  '++ alice.doSellAndBuy starting',
  'gallery escrow wins: {"label":{"issuer":{},"description":"pixels"},"quantity":[{"x":1,"y":4}]} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"description":"dust"},"quantity":6} refs: null',
  'gallery escrow wins: {"label":{"issuer":{},"description":"dust"},"quantity":6} refs: null',
  'alice escrow 2 wins: {"label":{"issuer":{},"description":"pixels"},"quantity":[{"x":1,"y":4}]} refs: null',
  'alice pixel purse balance {"label":{"issuer":{},"description":"pixels"},"quantity":[{"x":1,"y":4}]}',
  'alice dust purse balance {"label":{"issuer":{},"description":"dust"},"quantity":0}',
];

test('run gallery demo aliceSellsAndBuys with SES', async t => {
  const dump = await main(true, 'gallery', ['aliceSellsAndBuys']);
  t.deepEquals(dump.log, expectedAliceSellsAndBuysLog);
  t.end();
});

test('run gallery demo aliceSellsAndBuys without SES', async t => {
  const dump = await main(false, 'gallery', ['aliceSellsAndBuys']);
  t.deepEquals(dump.log, expectedAliceSellsAndBuysLog);
  t.end();
});

const expectedAliceSellsToBobLog = [
  '=> setup called',
  'starting aliceSellsToBob',
  'starting testAliceSellsToBob',
  '++ alice.doTapFaucetAndOfferViaCorkboard starting',
  'Alice collected 37 dust',
  'alice escrow wins: {"label":{"issuer":{},"description":"dust"},"quantity":37} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"pixels"},"quantity":[{"x":1,"y":4}]} refs: null',
  '++ aliceSellsToBob done',
  'bob tried to color, and produced #B695C0',
];

test('run gallery demo aliceSellsToBob with SES', async t => {
  const dump = await main(true, 'gallery', ['aliceSellsToBob']);
  t.deepEquals(dump.log, expectedAliceSellsToBobLog);
  t.end();
});

test('run gallery demo aliceSellsToBob without SES', async t => {
  const dump = await main(false, 'gallery', ['aliceSellsToBob']);
  t.deepEquals(dump.log, expectedAliceSellsToBobLog);
  t.end();
});
