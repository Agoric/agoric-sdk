import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '../../src/index';

async function main(withSES, basedir, argv) {
  const config = await loadBasedir(basedir);
  const ldSrcPath = require.resolve('../../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const successfulWithdraw = [
  '=> setup called',
  'starting mintTestPixelListAssay',
  'alice xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1}]}',
  'alice use balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1}]}',
  'payment xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0}]}',
];

test('run Pixel Demo mint and withdraw with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['mint']);
  t.deepEquals(dump.log, successfulWithdraw);
  t.end();
});

test('run Pixel Demo mint and withdraw without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['mint']);
  t.deepEquals(dump.log, successfulWithdraw);
  t.end();
});

const contractAliceFirstGolden = [
  '=> setup called',
  '++ alice.buyBobsPixelList starting',
  '++ bob.buy starting',
  '++ deposit',
  '++ withdrawal',
  '++ exchange done:exchange successful',
  '++ DONE',
];

test('run Pixel Demo --alice-first with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

test('run Pixel Demo --alice-first without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

const contractBobFirstGolden = [
  '=> setup called',
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]}],"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]}],"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"issuer":{},"description":"clams"},"quantity":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},null],[{"label":{"issuer":{},"description":"clams"},"quantity":10},null]]',
  '++ DONE',
  'alice money xfer balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice money use balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice pixels xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'alice pixels use balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'bob money xfer balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob money use balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob pixels xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
  'bob pixels use balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
];

test('run Pixel Demo --bob-first with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

test('run Pixel Demo --bob-first without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

const contractCoveredCallGolden = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"smackers"},"quantity":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},null],[{"label":{"issuer":{},"description":"smackers"},"quantity":10},null]]',
  '++ DONE',
  'alice money xfer balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice money use balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice pixel xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'alice pixel use balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'bob money xfer balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob money use balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob pixel xfer balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
  'bob pixel use balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
];

test('run Pixel Demo --covered-call with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGolden);
  t.end();
});

test('run Pixel Demo --covered-call without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGolden);
  t.end();
});
