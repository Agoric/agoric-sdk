// @ts-nocheck
/**
 * @file Zoe contract scenarios (exchange + autoswap AMM). Split from zoe.test.js
 * so each scenario's independent kernel boots on its own core; see
 * zoe-swingset-context.js.
 */
import test from 'ava';
import {
  buildZoeSwingsetData,
  runZoeScenario,
} from './zoe-swingset-context.js';

test.before(async t => {
  t.context.data = await buildZoeSwingsetData();
});

test.serial('zoe - simpleExchange - state Update', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 24, 0],
  ];
  const dump = await runZoeScenario(t, [
    'simpleExchangeNotifier',
    startingValues,
  ]);
  t.snapshot(dump.log);
});

test.serial('zoe - autoswap - valid inputs', async t => {
  const startingValues = [
    [10, 5, 0],
    [3, 7, 0],
  ];
  const dump = await runZoeScenario(t, ['autoswapOk', startingValues]);
  t.snapshot(dump.log);
});

test.serial('zoe - shutdown autoswap', async t => {
  const startingValues = [
    [10, 5, 0],
    [3, 7, 0],
  ];
  const dump = await runZoeScenario(t, ['shutdownAutoswap', startingValues]);
  t.snapshot(dump.log);
});
