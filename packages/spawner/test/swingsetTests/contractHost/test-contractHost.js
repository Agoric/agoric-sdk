import '@agoric/install-metering-and-ses';
import { test } from 'tape-promise/tape';
import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

async function main(withSES, basedir, argv) {
  const dir = path.resolve(`${__dirname}/..`, basedir);
  const config = await loadBasedir(dir);
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
  'starting mintTestDescOps',
  'starting mintTestNumber',
  'alice balance {"label":{"assay":{},"allegedName":"quatloos"},"extent":950}',
  'payment balance {"label":{"assay":{},"allegedName":"quatloos"},"extent":50}',
  'alice balance {"label":{"assay":{},"allegedName":"bucks"},"extent":950}',
  'payment balance {"label":{"assay":{},"allegedName":"bucks"},"extent":50}',
];

test.skip('run contractHost Demo --mint with SES', async t => {
  const dump = await main(true, 'contractHost', ['mint']);
  t.deepEquals(dump.log, contractMintGolden);
  t.end();
});

const contractTrivialGolden = [
  '=> setup called',
  'starting trivialContractTest',
  'Does source match? true',
  'foo balance {"brand":{},"extent":[{"installation":{},"terms":"foo terms","seatIdentity":{},"seatDesc":"foo"}]}',
  '++ eightP resolved to 8 (should be 8)',
  '++ DONE',
];
test('run contractHost Demo --trivial with SES', async t => {
  const dump = await main(true, 'contractHost', ['trivial']);
  t.deepEquals(dump.log, contractTrivialGolden);
  t.end();
});

test('run contractHost Demo --trivial-oldformat with SES', async t => {
  const dump = await main(true, 'contractHost', ['trivial-oldformat']);
  t.deepEquals(dump.log, contractTrivialGolden);
  t.end();
});

const contractExhaustedGolden = [
  '=> setup called',
  'starting exhaustedContractTest',
  'Does source match? true',
  'spawn rejected: Compute meter exceeded',
  'got return: 123',
];

test('run contractHost Demo -- exhaust with SES', async t => {
  const dump = await main(true, 'contractHost', ['exhaust']);
  t.deepEquals(dump.log, contractExhaustedGolden);
  t.end();
});

const contractAliceFirstGolden = [
  '=> setup called',
  '++ alice.payBobWell starting',
  '++ ifItFitsP done:If it fits, ware it.',
  '++ DONE',
];

test.skip('run contractHost Demo --alice-first with SES', async t => {
  const dump = await main(true, 'contractHost', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

const contractBobFirstGolden = [
  '=> setup called',
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite balance {"label":{"issuer":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"left":{"label":{"issuer":{},"allegedName":"clams"},"extent":10},"right":{"label":{"issuer":{},"allegedName":"fudco"},"extent":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"issuer":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"left":{"label":{"issuer":{},"allegedName":"clams"},"extent":10},"right":{"label":{"issuer":{},"allegedName":"fudco"},"extent":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"issuer":{},"allegedName":"clams"},"extent":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"allegedName":"fudco"},"extent":7} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"allegedName":"fudco"},"extent":7},null],[{"label":{"issuer":{},"allegedName":"clams"},"extent":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"allegedName":"clams"},"extent":990}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"fudco"},"extent":2009}',
  'bob money balance {"label":{"issuer":{},"allegedName":"clams"},"extent":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"fudco"},"extent":1996}',
];

test.skip('run contractHost Demo --bob-first with SES', async t => {
  const dump = await main(true, 'contractHost', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

const contractCoveredCallGolden = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite balance {"label":{"issuer":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"smackers"},"extent":10},"stock":{"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite balance {"label":{"issuer":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"smackers"},"extent":10},"stock":{"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"allegedName":"smackers"},"extent":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":7},null],[{"label":{"issuer":{},"allegedName":"smackers"},"extent":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"allegedName":"smackers"},"extent":990}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":2009}',
  'bob money balance {"label":{"issuer":{},"allegedName":"smackers"},"extent":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"yoyodyne"},"extent":1996}',
];

test.skip('run contractHost Demo --covered-call with SES', async t => {
  const dump = await main(true, 'contractHost', ['covered-call']);
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
  'alice options sale wins: {"label":{"issuer":{},"allegedName":"fins"},"extent":55} refs: null',
  'fred buys escrowed option wins: {"label":{"issuer":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"dough"},"extent":10},"stock":{"label":{"issuer":{},"allegedName":"wonka"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}} refs: null',
  'fred exercises option, buying stock wins: {"label":{"issuer":{},"allegedName":"wonka"},"extent":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"allegedName":"dough"},"extent":10} refs: null',
  '++ alice.acceptOptionForFred done',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[[{"label":{"issuer":{},"allegedName":"wonka"},"extent":7},null],[{"label":{"issuer":{},"allegedName":"fins"},"extent":55},null]],[{"label":{"issuer":{},"allegedName":"dough"},"extent":10},null]]',
  '++ DONE',
  'alice dough balance {"label":{"issuer":{},"allegedName":"dough"},"extent":1000}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"wonka"},"extent":2002}',
  'alice fins balance {"label":{"issuer":{},"allegedName":"fins"},"extent":3055}',
  'bob dough balance {"label":{"issuer":{},"allegedName":"dough"},"extent":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"wonka"},"extent":1996}',
  'fred dough balance {"label":{"issuer":{},"allegedName":"dough"},"extent":992}',
  'fred stock balance {"label":{"issuer":{},"allegedName":"wonka"},"extent":2011}',
  'fred fins balance {"label":{"issuer":{},"allegedName":"fins"},"extent":2946}',
];

test.skip('run contractHost Demo --covered-call-sale with SES', async t => {
  const dump = await main(true, 'contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});
