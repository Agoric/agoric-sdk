/* global __dirname */
import '@agoric/install-metering-and-ses';
import test from 'ava';
import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

async function main(basedir, argv) {
  const dir = path.resolve(`${__dirname}/..`, basedir);
  const config = await loadBasedir(dir);
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const contractMintGolden = [
  'starting mintTestDescOps',
  'starting mintTestNumber',
  'alice balance {"label":{"assay":{},"allegedName":"quatloos"},"value":950}',
  'payment balance {"label":{"assay":{},"allegedName":"quatloos"},"value":50}',
  'alice balance {"label":{"assay":{},"allegedName":"bucks"},"value":950}',
  'payment balance {"label":{"assay":{},"allegedName":"bucks"},"value":50}',
];

test.skip('run contractHost Demo --mint', async t => {
  const dump = await main('contractHost', ['mint']);
  t.deepEqual(dump.log, contractMintGolden);
});

const contractTrivialGolden = [
  'starting trivialContractTest',
  'Does source match? true',
  'foo balance {"brand":{},"value":[{"installation":{},"seatDesc":"foo","seatIdentity":{},"terms":"foo terms"}]}',
  '++ eightP resolved to 8 (should be 8)',
  '++ DONE',
];
test('run contractHost Demo --trivial', async t => {
  const dump = await main('contractHost', ['trivial']);
  t.deepEqual(dump.log, contractTrivialGolden);
});

test('run contractHost Demo --trivial-oldformat', async t => {
  const dump = await main('contractHost', ['trivial-oldformat']);
  t.deepEqual(dump.log, contractTrivialGolden);
});

const contractExhaustedGolden = [
  'starting exhaustedContractTest',
  'Does source match? true',
  'spawn rejected: Compute meter exceeded',
  'got return: 123',
];

test('run contractHost Demo -- exhaust', async t => {
  const dump = await main('contractHost', ['exhaust']);
  t.deepEqual(dump.log, contractExhaustedGolden);
});

const contractAliceFirstGolden = [
  '++ alice.payBobWell starting',
  '++ ifItFitsP done:If it fits, ware it.',
  '++ DONE',
];

test.skip('run contractHost Demo --alice-first', async t => {
  const dump = await main('contractHost', ['alice-first']);
  t.deepEqual(dump.log, contractAliceFirstGolden);
});

const contractBobFirstGolden = [
  '++ bob.tradeWell starting',
  '++ alice.acceptInvite starting',
  'alice invite balance {"label":{"issuer":{},"allegedName":"contract host"},"value":{"installation":{},"terms":{"left":{"label":{"issuer":{},"allegedName":"clams"},"value":10},"right":{"label":{"issuer":{},"allegedName":"fudco"},"value":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"issuer":{},"allegedName":"contract host"},"value":{"installation":{},"terms":{"left":{"label":{"issuer":{},"allegedName":"clams"},"value":10},"right":{"label":{"issuer":{},"allegedName":"fudco"},"value":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'bob escrow wins: {"label":{"issuer":{},"allegedName":"clams"},"value":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"allegedName":"fudco"},"value":7} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"allegedName":"fudco"},"value":7},null],[{"label":{"issuer":{},"allegedName":"clams"},"value":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"allegedName":"clams"},"value":990}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"fudco"},"value":2009}',
  'bob money balance {"label":{"issuer":{},"allegedName":"clams"},"value":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"fudco"},"value":1996}',
];

test.skip('run contractHost Demo --bob-first', async t => {
  const dump = await main('contractHost', ['bob-first']);
  t.deepEqual(dump.log, contractBobFirstGolden);
});

const contractCoveredCallGolden = [
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite balance {"label":{"issuer":{},"allegedName":"contract host"},"value":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"smackers"},"value":10},"stock":{"label":{"issuer":{},"allegedName":"yoyodyne"},"value":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite balance {"label":{"issuer":{},"allegedName":"contract host"},"value":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"smackers"},"value":10},"stock":{"label":{"issuer":{},"allegedName":"yoyodyne"},"value":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"issuer":{},"allegedName":"yoyodyne"},"value":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"allegedName":"smackers"},"value":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"allegedName":"yoyodyne"},"value":7},null],[{"label":{"issuer":{},"allegedName":"smackers"},"value":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"allegedName":"smackers"},"value":990}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"yoyodyne"},"value":2009}',
  'bob money balance {"label":{"issuer":{},"allegedName":"smackers"},"value":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"yoyodyne"},"value":1996}',
];

test.skip('run contractHost Demo --covered-call', async t => {
  const dump = await main('contractHost', ['covered-call']);
  t.deepEqual(dump.log, contractCoveredCallGolden);
});

const contractCoveredCallSaleGolden = [
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionForFred starting',
  '++ alice.completeOptionsSale starting',
  '++ fred.acceptOptionOffer starting',
  'Pretend singularity never happens',
  'alice options sale wins: {"label":{"issuer":{},"allegedName":"fins"},"value":55} refs: null',
  'fred buys escrowed option wins: {"label":{"issuer":{},"allegedName":"contract host"},"value":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"allegedName":"dough"},"value":10},"stock":{"label":{"issuer":{},"allegedName":"wonka"},"value":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}} refs: null',
  'fred exercises option, buying stock wins: {"label":{"issuer":{},"allegedName":"wonka"},"value":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"allegedName":"dough"},"value":10} refs: null',
  '++ alice.acceptOptionForFred done',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[[{"label":{"issuer":{},"allegedName":"wonka"},"value":7},null],[{"label":{"issuer":{},"allegedName":"fins"},"value":55},null]],[{"label":{"issuer":{},"allegedName":"dough"},"value":10},null]]',
  '++ DONE',
  'alice dough balance {"label":{"issuer":{},"allegedName":"dough"},"value":1000}',
  'alice stock balance {"label":{"issuer":{},"allegedName":"wonka"},"value":2002}',
  'alice fins balance {"label":{"issuer":{},"allegedName":"fins"},"value":3055}',
  'bob dough balance {"label":{"issuer":{},"allegedName":"dough"},"value":1011}',
  'bob stock balance {"label":{"issuer":{},"allegedName":"wonka"},"value":1996}',
  'fred dough balance {"label":{"issuer":{},"allegedName":"dough"},"value":992}',
  'fred stock balance {"label":{"issuer":{},"allegedName":"wonka"},"value":2011}',
  'fred fins balance {"label":{"issuer":{},"allegedName":"fins"},"value":2946}',
];

test.skip('run contractHost Demo --covered-call-sale', async t => {
  const dump = await main('contractHost', ['covered-call-sale']);
  t.deepEqual(dump.log, contractCoveredCallSaleGolden);
});
