// @ts-nocheck
/**
 * @file Zoe contract scenarios (auction + swap). Split from zoe.test.js so each
 * scenario's independent kernel boots on its own core; see
 * zoe-swingset-context.js.
 */

import '@endo/init/debug.js';

import test from 'ava';
import {
  buildZoeSwingsetData,
  runZoeScenario,
} from './zoe-swingset-context.js';

test.before(async t => {
  t.context.data = await buildZoeSwingsetData();
});

test.serial('zoe - secondPriceAuction - valid inputs', async t => {
  const startingValues = [
    [1, 0, 0],
    [0, 11, 0],
    [0, 7, 0],
    [0, 5, 0],
  ];
  const dump = await runZoeScenario(t, [
    'secondPriceAuctionOk',
    startingValues,
  ]);
  t.snapshot(dump.log);
});

test.serial('zoe - atomicSwap - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await runZoeScenario(t, ['atomicSwapOk', startingValues]);
  t.snapshot(dump.log);
});

test.serial('zoe - simpleExchange - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await runZoeScenario(t, ['simpleExchangeOk', startingValues]);
  t.snapshot(dump.log);
});
