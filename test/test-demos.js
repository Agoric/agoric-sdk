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

test('run encouragementBot Demo with SES', async t => {
  const dump = await main(true, 'demo/encouragementBot', []);
  t.deepEquals(dump.log, [
    '=> setup called',
    '=> user.talkToBot is called with encouragementBot',
    '=> encouragementBot.encourageMe got the name: user',
    "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
    '=> user receives the encouragement: user, you are awesome, keep it up!',
  ]);
  t.end();
});

test('run encouragementBot Demo without SES', async t => {
  const dump = await main(false, 'demo/encouragementBot', []);
  t.deepEquals(dump.log, [
    '=> setup called',
    '=> user.talkToBot is called with encouragementBot',
    '=> encouragementBot.encourageMe got the name: user',
    "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
    '=> user receives the encouragement: user, you are awesome, keep it up!',
  ]);
  t.end();
});

test('run encouragementBotComms Demo with SES', async t => {
  const dump = await main(true, 'demo/encouragementBotComms', []);
  t.deepEquals(dump.log, [
    '=> setup called',
    'addEgress called with sender user, index 0, valslot [object Object]',
    'addIngress called with machineName bot, index 0',
    '=> user.talkToBot is called with bot',
    "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
    '=> encouragementBot.encourageMe got the name: user',
    '=> user receives the encouragement: user, you are awesome, keep it up!',
  ]);
  t.end();
});

test('run encouragementBotComms Demo without SES', async t => {
  const dump = await main(false, 'demo/encouragementBotComms');
  t.deepEquals(dump.log, [
    '=> setup called',
    'addEgress called with sender user, index 0, valslot [object Object]',
    'addIngress called with machineName bot, index 0',
    '=> user.talkToBot is called with bot',
    "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
    '=> encouragementBot.encourageMe got the name: user',
    '=> user receives the encouragement: user, you are awesome, keep it up!',
  ]);
  t.end();
});

/*
TODO get these tests working again!

test('run contractHost Demo --mint with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['mint']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'starting mintTest',
    'makeMint',
    'makeEmptyPurse(deposit)',
    'deposit[deposit]#1: bal=0 amt=50',
    ' dep[deposit]#1 (post-P): bal=0 amt=50',
    'getBalance',
    'getBalance',
    '++ balances:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --mint without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['mint']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'starting mintTest',
    'makeMint',
    'makeEmptyPurse(deposit)',
    'deposit[deposit]#1: bal=0 amt=50',
    ' dep[deposit]#1 (post-P): bal=0 amt=50',
    'getBalance',
    'getBalance',
    '++ balances:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --trivial with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['trivial']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'starting trivialContractTest',
    '++ eightP resolved to',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --trivial without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['trivial']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'starting trivialContractTest',
    '++ eightP resolved to',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --alice-first with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['alice-first']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    'makeEmptyPurse(undefined)',
    'deposit[undefined]#1: bal=0 amt=10',
    ' dep[undefined]#1 (post-P): bal=0 amt=10',
    'deposit[undefined]#2: bal=1001 amt=10',
    ' dep[undefined]#2 (post-P): bal=1001 amt=10',
    '++ ifItFitsP done:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --alice-first without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['alice-first']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    'makeEmptyPurse(undefined)',
    'deposit[undefined]#1: bal=0 amt=10',
    ' dep[undefined]#1 (post-P): bal=0 amt=10',
    'deposit[undefined]#2: bal=1001 amt=10',
    ' dep[undefined]#2 (post-P): bal=1001 amt=10',
    '++ ifItFitsP done:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --bob-first with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['bob-first']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    '++ bob.tradeWell starting',
    '++ bob.invite start',
    '++ bob.invite passed check',
    'makeEmptyPurse(bobMoneyDst)',
    'makeEmptyPurse(bobStockSrc)',
    'makeEmptyPurse(aliceMoneySrc)',
    'makeEmptyPurse(aliceStockDst)',
    'deposit[bobStockSrc]#1: bal=0 amt=7',
    'deposit[aliceMoneySrc]#2: bal=0 amt=10',
    ' dep[bobStockSrc]#1 (post-P): bal=0 amt=7',
    ' dep[aliceMoneySrc]#2 (post-P): bal=0 amt=10',
    '++ bob.invite ackP',
    'makeEmptyPurse(escrow)',
    'makeEmptyPurse(escrow)',
    'deposit[escrow]#3: bal=0 amt=10',
    'deposit[escrow]#4: bal=0 amt=7',
    ' dep[escrow]#3 (post-P): bal=0 amt=10',
    ' dep[escrow]#4 (post-P): bal=0 amt=7',
    'deposit[bobMoneyDst]#5: bal=0 amt=10',
    'deposit[aliceStockDst]#6: bal=0 amt=7',
    ' dep[bobMoneyDst]#5 (post-P): bal=0 amt=10',
    ' dep[aliceStockDst]#6 (post-P): bal=0 amt=7',
    '++ bob.invite doneP',
    'getBalance',
    'getBalance',
    '++ bob.tradeWell done',
    '++ bobP.tradeWell done:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --bob-first without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['bob-first']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    '++ bob.tradeWell starting',
    '++ bob.invite start',
    '++ bob.invite passed check',
    'makeEmptyPurse(bobMoneyDst)',
    'makeEmptyPurse(bobStockSrc)',
    'makeEmptyPurse(aliceMoneySrc)',
    'makeEmptyPurse(aliceStockDst)',
    'deposit[bobStockSrc]#1: bal=0 amt=7',
    'deposit[aliceMoneySrc]#2: bal=0 amt=10',
    ' dep[bobStockSrc]#1 (post-P): bal=0 amt=7',
    ' dep[aliceMoneySrc]#2 (post-P): bal=0 amt=10',
    '++ bob.invite ackP',
    'makeEmptyPurse(escrow)',
    'makeEmptyPurse(escrow)',
    'deposit[escrow]#3: bal=0 amt=10',
    'deposit[escrow]#4: bal=0 amt=7',
    ' dep[escrow]#3 (post-P): bal=0 amt=10',
    ' dep[escrow]#4 (post-P): bal=0 amt=7',
    'deposit[bobMoneyDst]#5: bal=0 amt=10',
    'deposit[aliceStockDst]#6: bal=0 amt=7',
    ' dep[bobMoneyDst]#5 (post-P): bal=0 amt=10',
    ' dep[aliceStockDst]#6 (post-P): bal=0 amt=7',
    '++ bob.invite doneP',
    'getBalance',
    'getBalance',
    '++ bob.tradeWell done',
    '++ bobP.tradeWell done:',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --bob-first-lies with SES', async t => {
  const dump = await main(true, 'demo/contractHost', ['bob-first-lies']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    '++ bob.tradeWell starting',
    '++ bob.invite start',
    '++ bob.invite passed check',
    'makeEmptyPurse(bobMoneyDst)',
    'makeEmptyPurse(bobStockSrc)',
    'makeEmptyPurse(aliceMoneySrc)',
    'makeEmptyPurse(aliceStockDst)',
    'deposit[bobStockSrc]#1: bal=0 amt=7',
    'deposit[aliceMoneySrc]#2: bal=0 amt=10',
    ' dep[bobStockSrc]#1 (post-P): bal=0 amt=7',
    ' dep[aliceMoneySrc]#2 (post-P): bal=0 amt=10',
    '++ bob.invite ackP',
    '++ bob.tradeWell reject',
    '++ DONE',
  ]);
  t.end();
});

test('run contractHost Demo --bob-first-lies without SES', async t => {
  const dump = await main(false, 'demo/contractHost', ['bob-first-lies']);
  t.deepEquals(dump.log, [
    '=> setup called',
    'makeMint',
    'makeMint',
    '++ bob.tradeWell starting',
    '++ bob.invite start',
    '++ bob.invite passed check',
    'makeEmptyPurse(bobMoneyDst)',
    'makeEmptyPurse(bobStockSrc)',
    'makeEmptyPurse(aliceMoneySrc)',
    'makeEmptyPurse(aliceStockDst)',
    'deposit[bobStockSrc]#1: bal=0 amt=7',
    'deposit[aliceMoneySrc]#2: bal=0 amt=10',
    ' dep[bobStockSrc]#1 (post-P): bal=0 amt=7',
    ' dep[aliceMoneySrc]#2 (post-P): bal=0 amt=10',
    '++ bob.invite ackP',
    '++ bob.tradeWell reject',
    '++ DONE',
  ]);
  t.end();
});

*/
