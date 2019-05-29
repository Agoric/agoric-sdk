import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '../src/index';

async function main(withSES, basedir, argv) {
  const config = await loadBasedir(basedir);
  const ldSrcPath = require.resolve('../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const encouragementBotGolden = [
  '=> setup called',
  '=> user.talkToBot is called with encouragementBot',
  '=> encouragementBot.encourageMe got the name: user',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

test('run encouragementBot Demo with SES', async t => {
  const dump = await main(true, 'demo/encouragementBot', []);
  t.deepEquals(dump.log, encouragementBotGolden);
  t.end();
});

test('run encouragementBot Demo without SES', async t => {
  const dump = await main(false, 'demo/encouragementBot', []);
  t.deepEquals(dump.log, encouragementBotGolden);
  t.end();
});

const encouragementBotCommsGolden = [
  '=> setup called',
  'addEgress called with sender user, index 0, valslot [object Object]',
  'addIngress called with machineName bot, index 0',
  '=> user.talkToBot is called with bot',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> encouragementBot.encourageMe got the name: user',
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

test('run encouragementBotComms Demo with SES', async t => {
  const dump = await main(true, 'demo/encouragementBotComms', []);
  t.deepEquals(dump.log, encouragementBotCommsGolden);
  t.end();
});

test('run encouragementBotComms Demo without SES', async t => {
  const dump = await main(false, 'demo/encouragementBotComms');
  t.deepEquals(dump.log, encouragementBotCommsGolden);
  t.end();
});

const contractMintGolden = [
  '=> setup called',
  'starting mintTestAssay',
  'starting mintTestNumber',
  'alice xfer balance {"label":{"issuer":{},"description":"quatloos"},"quantity":950}',
  'alice use balance {"label":{"issuer":{},"description":"quatloos"},"quantity":1000}',
  'payment xfer balance {"label":{"issuer":{},"description":"quatloos"},"quantity":50}',
  'alice xfer balance {"label":{"issuer":{},"description":"bucks"},"quantity":950}',
  'alice use balance {"label":{"issuer":{},"description":"bucks"},"quantity":1000}',
  'payment xfer balance {"label":{"issuer":{},"description":"bucks"},"quantity":50}',
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
  'foo xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"function trivCo...foo\', 8);\\n    }","terms":"foo terms","seatDesc":"foo"}},"quantity":1}}',
  '++ eightP resolved to 8 (should be 8)',
  '++ DONE',
  'foo xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":null}',
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
  'alice invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"(function escro...Seat),\\n  ]);\\n})","terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"fudco"},"quantity":7}],"seatDesc":"left"}},"quantity":1}}',
  'verified invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"(function escro...Seat),\\n  ]);\\n})","terms":[{"label":{"issuer":{},"description":"clams"},"quantity":10},{"label":{"issuer":{},"description":"fudco"},"quantity":7}],"seatDesc":"left"}},"quantity":1}}',
  'bob escrow wins: {"label":{"issuer":{},"description":"clams"},"quantity":10} refs: null',
  'alice escrow wins: {"label":{"issuer":{},"description":"fudco"},"quantity":7} refs: null',
  '++ bob.tradeWell done',
  '++ bobP.tradeWell done:[[{"label":{"issuer":{},"description":"fudco"},"quantity":7},null],[{"label":{"issuer":{},"description":"clams"},"quantity":10},null]]',
  '++ DONE',
  'alice money xfer balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice money use balance {"label":{"issuer":{},"description":"clams"},"quantity":990}',
  'alice stock xfer balance {"label":{"issuer":{},"description":"fudco"},"quantity":2009}',
  'alice stock use balance {"label":{"issuer":{},"description":"fudco"},"quantity":2009}',
  'bob money xfer balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob money use balance {"label":{"issuer":{},"description":"clams"},"quantity":1011}',
  'bob stock xfer balance {"label":{"issuer":{},"description":"fudco"},"quantity":1996}',
  'bob stock use balance {"label":{"issuer":{},"description":"fudco"},"quantity":1996}',
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

const contractCoveredCallGolden = [
  '=> setup called',
  '++ bob.offerAliceOption starting',
  '++ alice.acceptOptionDirectly starting',
  'Pretend singularity never happens',
  'alice invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"(function() {\\n ...Seat);\\n});\\n}())","terms":[{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},{},"singularity"],"seatDesc":"holder"}},"quantity":1}}',
  'verified invite xfer balance {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"(function() {\\n ...Seat);\\n});\\n}())","terms":[{"label":{"issuer":{},"description":"smackers"},"quantity":10},{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},{},"singularity"],"seatDesc":"holder"}},"quantity":1}}',
  'alice option wins: {"label":{"issuer":{},"description":"yoyodyne"},"quantity":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"smackers"},"quantity":10} refs: null',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[{"label":{"issuer":{},"description":"yoyodyne"},"quantity":7},null],[{"label":{"issuer":{},"description":"smackers"},"quantity":10},null]]',
  '++ DONE',
  'alice money xfer balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice money use balance {"label":{"issuer":{},"description":"smackers"},"quantity":990}',
  'alice stock xfer balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":2009}',
  'alice stock use balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":2009}',
  'bob money xfer balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob money use balance {"label":{"issuer":{},"description":"smackers"},"quantity":1011}',
  'bob stock xfer balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":1996}',
  'bob stock use balance {"label":{"issuer":{},"description":"yoyodyne"},"quantity":1996}',
];

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
  'fred buys escrowed option wins: {"label":{"issuer":{},"description":"contract host"},"quantity":{"label":{"identity":{},"description":{"contractSrc":"(function() {\\n ...Seat);\\n});\\n}())","terms":[{"label":{"issuer":{},"description":"dough"},"quantity":10},{"label":{"issuer":{},"description":"wonka"},"quantity":7},{},"singularity"],"seatDesc":"holder"}},"quantity":1}} refs: null',
  'fred exercises option, buying stock wins: {"label":{"issuer":{},"description":"wonka"},"quantity":7} refs: null',
  'bob option wins: {"label":{"issuer":{},"description":"dough"},"quantity":10} refs: null',
  '++ alice.acceptOptionForFred done',
  '++ bob.offerAliceOption done',
  '++ bobP.offerAliceOption done:[[[{"label":{"issuer":{},"description":"wonka"},"quantity":7},null],[{"label":{"issuer":{},"description":"fins"},"quantity":55},null]],[{"label":{"issuer":{},"description":"dough"},"quantity":10},null]]',
  '++ DONE',
  'alice dough xfer balance {"label":{"issuer":{},"description":"dough"},"quantity":1000}',
  'alice dough use balance {"label":{"issuer":{},"description":"dough"},"quantity":1000}',
  'alice stock xfer balance {"label":{"issuer":{},"description":"wonka"},"quantity":2002}',
  'alice stock use balance {"label":{"issuer":{},"description":"wonka"},"quantity":2002}',
  'alice fins xfer balance {"label":{"issuer":{},"description":"fins"},"quantity":3055}',
  'alice fins use balance {"label":{"issuer":{},"description":"fins"},"quantity":3055}',
  'bob dough xfer balance {"label":{"issuer":{},"description":"dough"},"quantity":1011}',
  'bob dough use balance {"label":{"issuer":{},"description":"dough"},"quantity":1011}',
  'bob stock xfer balance {"label":{"issuer":{},"description":"wonka"},"quantity":1996}',
  'bob stock use balance {"label":{"issuer":{},"description":"wonka"},"quantity":1996}',
  'fred dough xfer balance {"label":{"issuer":{},"description":"dough"},"quantity":992}',
  'fred dough use balance {"label":{"issuer":{},"description":"dough"},"quantity":992}',
  'fred stock xfer balance {"label":{"issuer":{},"description":"wonka"},"quantity":2011}',
  'fred stock use balance {"label":{"issuer":{},"description":"wonka"},"quantity":2011}',
  'fred fins xfer balance {"label":{"issuer":{},"description":"fins"},"quantity":2946}',
  'fred fins use balance {"label":{"issuer":{},"description":"fins"},"quantity":2946}',
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
