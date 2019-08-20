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
  'starting mintTestAssay',
  'starting mintTestNumber',
  'alice balance {"label":{"issuer":{},"description":"quatloos"},"quantity":950}',
  'payment balance {"label":{"issuer":{},"description":"quatloos"},"quantity":50}',
  'alice balance {"label":{"issuer":{},"description":"bucks"},"quantity":950}',
  'payment balance {"label":{"issuer":{},"description":"bucks"},"quantity":50}',
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
  'foo balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":"foo terms","seatIdentity":{},"seatDesc":"foo"}}',
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
  'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":{"left":{"label":{"issuer":{},"description":"clams"},"quantity":10},"right":{"label":{"issuer":{},"description":"fudco"},"quantity":7}},"seatIdentity":{},"seatDesc":"left"}}',
  'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":{"left":{"label":{"issuer":{},"description":"clams"},"quantity":10},"right":{"label":{"issuer":{},"description":"fudco"},"quantity":7}},"seatIdentity":{},"seatDesc":"left"}}',
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
  'alice invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"description":"smackers"},"quantity":10},"stock":{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'verified invite balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"description":"smackers"},"quantity":10},"stock":{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}}',
  'alice option wins: {"label":{"issuer":{},"description":"yoyodyne"},"quantity":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"smackers"},"quantity":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},null],[{"label":{"issuer":{},"description":"smackers"},"quantity":10},null]]',
  '++ DONE',
  'alice money balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice stock balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":2009}',
  'bob money balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob stock balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":1996}',
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
  'alice options sale wins: {"label":{"issuer":{},"description":"fins"},"quantity":55} refs: null',
  'fred buys escrowed option wins: {"label":{"issuer":{},"description":"contract host"},"quantity":{"installation":{},"terms":{"escrowExchangeInstallation":{},"money":{"label":{"issuer":{},"description":"dough"},"quantity":10},"stock":{"label":{"issuer":{},"description":"wonka"},"quantity":7},"timer":{},"deadline":"singularity"},"seatIdentity":{},"seatDesc":"holder"}} refs: null',
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
  const dump = await main(true, 'contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});

test('run contractHost Demo --covered-call-sale without SES', async t => {
  const dump = await main(false, 'contractHost', ['covered-call-sale']);
  t.deepEquals(dump.log, contractCoveredCallSaleGolden);
  t.end();
});
