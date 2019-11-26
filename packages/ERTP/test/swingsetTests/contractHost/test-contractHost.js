import { test } from 'tape-promise/tape';
import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

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

const contractMintGolden = [
  '=> setup called',
  'starting mintTestDescOps',
  'starting mintTestNumber',
  'alice balance {"label":{"assay":{},"allegedName":"quatloos"},"extent":950}',
  'payment balance {"label":{"assay":{},"allegedName":"quatloos"},"extent":50}',
  'alice balance {"label":{"assay":{},"allegedName":"bucks"},"extent":950}',
  'payment balance {"label":{"assay":{},"allegedName":"bucks"},"extent":50}',
];

test('run contractHost Demo --mint with SES', async t => {
  const dump = await main(true, 'contractHost', ['mint']);
  t.deepEquals(dump.log, contractMintGolden);
  t.end();
});

test('run contractHost Demo --mint without SES', async t => {
  const dump = await main(false, 'contractHost', ['mint']);
  t.deepEquals(dump.log, contractMintGolden);
  t.end();
});

const contractTrivialGolden = [
  '=> setup called',
  'starting trivialContractTest',
  'Does source match? true',
  'foo balance {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":"foo terms","seatIdentity":{},"seatDesc":"foo"}}',
  '++ eightP resolved to 8 (should be 8)',
  '++ DONE',
];

test('run contractHost Demo --trivial with SES', async t => {
  const dump = await main(true, 'contractHost', ['trivial']);
  t.deepEquals(dump.log, contractTrivialGolden);
  t.end();
});

test('run contractHost Demo --trivial without SES', async t => {
  const dump = await main(false, 'contractHost', ['trivial']);
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
  const dump = await main(true, 'contractHost', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

test('run contractHost Demo --alice-first without SES', async t => {
  const dump = await main(false, 'contractHost', ['alice-first']);
  t.deepEquals(dump.log, contractAliceFirstGolden);
  t.end();
});

const contractBobFirstGolden = [
  '=> setup called',
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite balance {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"left":{"label":{"assay":{},"allegedName":"clams"},"extent":10},"right":{"label":{"assay":{},"allegedName":"fudco"},"extent":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"left":{"label":{"assay":{},"allegedName":"clams"},"extent":10},"right":{"label":{"assay":{},"allegedName":"fudco"},"extent":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"assay":{},"allegedName":"clams"},"extent":10} refs: null',
  'alice escrow wins: {"label":{"assay":{},"allegedName":"fudco"},"extent":7} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"assay":{},"allegedName":"fudco"},"extent":7},null],[{"label":{"assay":{},"allegedName":"clams"},"extent":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"assay":{},"allegedName":"clams"},"extent":990}',
  'alice stock balance {"label":{"assay":{},"allegedName":"fudco"},"extent":2009}',
  'bob money balance {"label":{"assay":{},"allegedName":"clams"},"extent":1011}',
  'bob stock balance {"label":{"assay":{},"allegedName":"fudco"},"extent":1996}',
];

test('run contractHost Demo --bob-first with SES', async t => {
  const dump = await main(true, 'contractHost', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

test('run contractHost Demo --bob-first without SES', async t => {
  const dump = await main(false, 'contractHost', ['bob-first']);
  t.deepEquals(dump.log, contractBobFirstGolden);
  t.end();
});

const contractCoveredCallGolden = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite balance {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"assay":{},"allegedName":"smackers"},"extent":10},"stock":{"label":{"assay":{},"allegedName":"yoyodyne"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite balance {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"assay":{},"allegedName":"smackers"},"extent":10},"stock":{"label":{"assay":{},"allegedName":"yoyodyne"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"assay":{},"allegedName":"yoyodyne"},"extent":7} refs: null',
  'bob option wins: {"label":{"assay":{},"allegedName":"smackers"},"extent":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"assay":{},"allegedName":"yoyodyne"},"extent":7},null],[{"label":{"assay":{},"allegedName":"smackers"},"extent":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"assay":{},"allegedName":"smackers"},"extent":990}',
  'alice stock balance {"label":{"assay":{},"allegedName":"yoyodyne"},"extent":2009}',
  'bob money balance {"label":{"assay":{},"allegedName":"smackers"},"extent":1011}',
  'bob stock balance {"label":{"assay":{},"allegedName":"yoyodyne"},"extent":1996}',
];

test('run contractHost Demo --covered-call with SES', async t => {
  const dump = await main(true, 'contractHost', ['covered-call']);
  t.deepEquals(dump.log, contractCoveredCallGolden);
  t.end();
});

test('run contractHost Demo --covered-call without SES', async t => {
  const dump = await main(false, 'contractHost', ['covered-call']);
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
  'alice options sale wins: {"label":{"assay":{},"allegedName":"fins"},"extent":55} refs: null',
  'fred buys escrowed option wins: {"label":{"assay":{},"allegedName":"contract host"},"extent":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"assay":{},"allegedName":"dough"},"extent":10},"stock":{"label":{"assay":{},"allegedName":"wonka"},"extent":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}} refs: null',
  'fred exercises option, buying stock wins: {"label":{"assay":{},"allegedName":"wonka"},"extent":7} refs: null',
  'bob option wins: {"label":{"assay":{},"allegedName":"dough"},"extent":10} refs: null',
  '++ alice.acceptOptionForFred done',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[[{"label":{"assay":{},"allegedName":"wonka"},"extent":7},null],[{"label":{"assay":{},"allegedName":"fins"},"extent":55},null]],[{"label":{"assay":{},"allegedName":"dough"},"extent":10},null]]',
  '++ DONE',
  'alice dough balance {"label":{"assay":{},"allegedName":"dough"},"extent":1000}',
  'alice stock balance {"label":{"assay":{},"allegedName":"wonka"},"extent":2002}',
  'alice fins balance {"label":{"assay":{},"allegedName":"fins"},"extent":3055}',
  'bob dough balance {"label":{"assay":{},"allegedName":"dough"},"extent":1011}',
  'bob stock balance {"label":{"assay":{},"allegedName":"wonka"},"extent":1996}',
  'fred dough balance {"label":{"assay":{},"allegedName":"dough"},"extent":992}',
  'fred stock balance {"label":{"assay":{},"allegedName":"wonka"},"extent":2011}',
  'fred fins balance {"label":{"assay":{},"allegedName":"fins"},"extent":2946}',
];

test('run contractHost Demo --covered-call-sale with SES', async t => {
  const dump = await main(true, 'contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});

test('run contractHost Demo --covered-call-sale without SES', async t => {
  const dump = await main(false, 'contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});
