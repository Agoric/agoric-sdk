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

const contractMintGolden = [
  '=> setup called',
  'starting mintTestAssay',
  'starting mintTestNumber',
  'alice balance {"label":{"issuer":{},"description":"quatloos"},"quantity":950}',
  'payment balance {"label":{"issuer":{},"description":"quatloos"},"quantity":50}',
  'alice balance {"label":{"issuer":{},"description":"bucks"},"quantity":950}',
  'payment balance {"label":{"issuer":{},"description":"bucks"},"quantity":50}',
];

test('run contractHost Demo --mint with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['mint']);
  t.deepEquals(dump.log, contractMintGolden);
  t.end();
});

test('run contractHost Demo --mint without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['mint']);
  t.deepEquals(dump.log, contractMintGolden);
  t.end();
});

const contractTrivialGolden = [
  '=> setup called',
  'starting trivialContractTest',
  "Does source function trivContract(terms, inviteMaker) {\n      return inviteMaker.make('foo', 8);\n    } match? true",
  'foo balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":"foo terms","seatIdentity":{},"seatDesc":"foo"}}',
  '++ eightP resolved to 8 (should be 8)',
  '++ DONE',
  'foo balance {"label":{"issuer":{},"description":"contract host"},"quantity":null}',
];

test('run contractHost Demo --trivial with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['trivial']);
  t.deepEquals(dump.log, contractTrivialGolden);
  t.end();
});

test('run contractHost Demo --trivial without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['trivial']);
  t.deepEquals(dump.log, contractTrivialGolden);
  t.end();
});

const contractAliceFirstGolden = [
  '=> setup called',
  '++ alice.payBobWell starting',
  '++ ifItFitsP done:If it fits, ware it.',
  '++ DONE',
];

test('run contractHost Demo --alice-first with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

test('run contractHost Demo --alice-first without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

const contractBobFirstGolden = [
  '=> setup called',
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"fudco"},"quantity":7}],"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"fudco"},"quantity":7}],"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"issuer":{},"description":"clams"},"quantity":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"description":"fudco"},"quantity":7} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"description":"fudco"},"quantity":7},null],[{"label":{"issuer":{},"description":"clams"},"quantity":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice stock balance {"label":{"issuer":{},"description":"fudco"},"quantity":2009}',
  'bob money balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob stock balance {"label":{"issuer":{},"description":"fudco"},"quantity":1996}',
];

test('run contractHost Demo --bob-first with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

test('run contractHost Demo --bob-first without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

const contractCoveredCallGolden = [ '=> setup called', '++ bob.offerAliceOption starting', '++ alice.acceptOptionDirectly starting', 'Pretend singularity never happens', 'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{},{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}', 'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{},{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}', 'alice option wins: {"label":{"issuer":{},"description":"yoyodyne"},"quantity":7} refs: null', 'bob option wins: {"label":{"issuer":{},"description":"smackers"},"quantity":10} refs: null', '++ bob.offerAliceOption done', '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},null],[{"label":{"issuer":{},"description":"smackers"},"quantity":10},null]]', '++ DONE', 'alice money balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}', 'alice stock balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":2009}', 'bob money balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}', 'bob stock balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":1996}' ];

test('run contractHost Demo --covered-call with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGolden);
  t.end();
});

test('run contractHost Demo --covered-call without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGolden);
  t.end();
});

const contractCoveredCallSaleGolden = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionForFred starting',
  '++ alice.completeOptionsSale starting',
  '++ fred.acceptOptionOffer starting',
  'Pretend singularity never happens',
  'alice options sale wins: {"label":{"issuer":{},"description":"fins"},"quantity":55} refs: null',
  'fred buys escrowed option wins: {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{},{"label":{"issuer":{},"description":"dough"},"quantity":10},{"label":{"issuer":{},"description":"wonka"},"quantity":7},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}} refs: null',
  'fred exercises option, buying stock wins: {"label":{"issuer":{},"description":"wonka"},"quantity":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"dough"},"quantity":10} refs: null',
  '++ alice.acceptOptionForFred done',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[[{"label":{"issuer":{},"description":"wonka"},"quantity":7},null],[{"label":{"issuer":{},"description":"fins"},"quantity":55},null]],[{"label":{"issuer":{},"description":"dough"},"quantity":10},null]]',
  '++ DONE',
  'alice dough balance {"label":{"issuer":{},"description":"dough"},"quantity":1000}',
  'alice stock balance {"label":{"issuer":{},"description":"wonka"},"quantity":2002}',
  'alice fins balance {"label":{"issuer":{},"description":"fins"},"quantity":3055}',
  'bob dough balance {"label":{"issuer":{},"description":"dough"},"quantity":1011}',
  'bob stock balance {"label":{"issuer":{},"description":"wonka"},"quantity":1996}',
  'fred dough balance {"label":{"issuer":{},"description":"dough"},"quantity":992}',
  'fred stock balance {"label":{"issuer":{},"description":"wonka"},"quantity":2011}',
  'fred fins balance {"label":{"issuer":{},"description":"fins"},"quantity":2946}',
];

test('run contractHost Demo --covered-call-sale with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});

test('run contractHost Demo --covered-call-sale without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});

const corkboardAssaysGolden = [
  '=> setup called',
  'starting testCorkboardAssay',
  'starting testCorkboardAssayQuantities',
];

test('run handoff Demo --corkboard assays', async t => {
  const dump = await main(false, 'demo/handoff', ['corkboardAssay']);
  t.deepEquals(dump.log, corkboardAssaysGolden);
  t.end();
});

test('run handoff Demo --corkboard assays', async t => {
  const dump = await main(true, 'demo/handoff', ['corkboardAssay']);
  t.deepEquals(dump.log, corkboardAssaysGolden);
  t.end();
});

const corkboardContentsGolden = [
  '=> setup called',
  'starting testCorkboardStorage',
];

test('run handoff Demo --corkboard contents', async t => {
  const dump = await main(false, 'demo/handoff', ['corkboard']);
  t.deepEquals(dump.log, corkboardContentsGolden);
  t.end();
});

test('run handoff Demo --corkboard contents', async t => {
  const dump = await main(true, 'demo/handoff', ['corkboard']);
  t.deepEquals(dump.log, corkboardContentsGolden);
  t.end();
});

const handoffTestGolden = [
  '=> setup called',
  'starting testHandoffStorage',
  'expected validate to throw',
];

test('run handoff Demo --handoff service', async t => {
  const dump = await main(false, 'demo/handoff', ['handoff']);
  t.deepEquals(dump.log, handoffTestGolden);
  t.end();
});

test('run handoff Demo --handoff service', async t => {
  const dump = await main(true, 'demo/handoff', ['handoff']);
  t.deepEquals(dump.log, handoffTestGolden);
  t.end();
});

const twoPartyHandoffGolden = [
  '=> setup called',
  'starting testHandoffStorage',
  'expecting coordination on 42.',
];

test('run handoff Demo --Two Party handoff', async t => {
  const dump = await main(false, 'demo/handoff', ['twoVatHandoff']);
  t.deepEquals(dump.log, twoPartyHandoffGolden);
  t.end();
});

test('run handoff Demo --Two Party handoff', async t => {
  const dump = await main(true, 'demo/handoff', ['twoVatHandoff']);
  t.deepEquals(dump.log, twoPartyHandoffGolden);
  t.end();
});

const successfulWithdraw = [
  '=> setup called',
  'starting mintTestPixelListAssay',
  'alice balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1}]}',
  'payment balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0}]}',
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

const contractAliceFirstGoldenPixel = [
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
  t.deepEquals(dump.log, contractAliceFirstGoldenPixel);
  t.end();
});

test('run Pixel Demo --alice-first without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGoldenPixel);
  t.end();
});

const contractBobFirstGoldenPixel = [
  '=> setup called',
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]}],"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]}],"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"issuer":{},"description":"clams"},"quantity":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},null],[{"label":{"issuer":{},"description":"clams"},"quantity":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice pixels balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'bob money balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob pixels balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
];

test('run Pixel Demo --bob-first with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGoldenPixel);
  t.end();
});

test('run Pixel Demo --bob-first without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGoldenPixel);
  t.end();
});

const contractCoveredCallGoldenPixel = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{},{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":[{},{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},{},"singularity"],"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"smackers"},"quantity":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":1}]},null],[{"label":{"issuer":{},"description":"smackers"},"quantity":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice pixel balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1}]}',
  'bob money balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob pixel balance {"label":{"issuer":{},"description":"pixelList"},"quantity":[{"x":1,"y":0}]}',
];

test('run Pixel Demo --covered-call with SES', async t => {
  const dump = await main(true, 'demo/pixel-demo', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGoldenPixel);
  t.end();
});

test('run Pixel Demo --covered-call without SES', async t => {
  const dump = await main(false, 'demo/pixel-demo', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGoldenPixel);
  t.end();
});
