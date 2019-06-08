import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';

async function main(withSES, basedir, argv) {
  const config = await loadBasedir(basedir);
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
  const dump = await main(true, 'demo/gallery', ['tapFaucet']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});

test('run gallery demo tapFaucet without SES', async t => {
  const dump = await main(false, 'demo/gallery', ['tapFaucet']);
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
];

test('run gallery demo aliceChangesColor with SES', async t => {
  const dump = await main(true, 'demo/gallery', ['aliceChangesColor']);
  t.deepEquals(dump.log, expectedAliceChangesColorLog);
  t.end();
});

test('run gallery demo aliceChangesColor without SES', async t => {
  const dump = await main(false, 'demo/gallery', ['aliceChangesColor']);
  t.deepEquals(dump.log, expectedAliceChangesColorLog);
  t.end();
});

const expectedAliceSendsOnlyUseRightLog = [
  '=> setup called',
  'aliceSendsOnlyUseRight',
  'alice is made',
  'starting testAliceSendsOnlyUseRight',
  '++ alice.doOnlySendUseRight starting',
  'tapped Faucet',
  'pixel x:1, y:4 has original color #D3D3D3',
  '++ bob.receiveUseRight starting',
  "pixel x:1, y:4 changed to bob's color #B695C0",
  "pixel x:1, y:4 changed to alice's color #9FBF95",
  'bob was unable to color: Error: no use rights present',
];

test('run gallery demo aliceSendsOnlyUseRight with SES', async t => {
  const dump = await main(true, 'demo/gallery', ['aliceSendsOnlyUseRight']);
  t.deepEquals(dump.log, expectedAliceSendsOnlyUseRightLog);
  t.end();
});

test('run gallery demo aliceSendsOnlyUseRight without SES', async t => {
  const dump = await main(false, 'demo/gallery', ['aliceSendsOnlyUseRight']);
  t.deepEquals(dump.log, expectedAliceSendsOnlyUseRightLog);
  t.end();
});
