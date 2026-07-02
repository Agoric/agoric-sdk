// @ts-nocheck
/**
 * @file Zoe contract scenarios (refund + options). Split from a single file
 * into siblings (zoe-auction-swap, zoe-exchange-amm, zoe-sales) so each
 * scenario's independent kernel boots on its own core; see
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

test.serial('zoe - automaticRefund - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 17, 0],
  ];
  const dump = await runZoeScenario(t, ['automaticRefundOk', startingValues]);
  t.snapshot(dump.log);
});

test.serial('zoe - coveredCall - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 7, 0],
  ];
  const dump = await runZoeScenario(t, ['coveredCallOk', startingValues]);
  t.snapshot(dump.log);
});

test.serial('zoe - swapForOption - valid inputs', async t => {
  const startingValues = [
    [3, 0, 0], // Alice starts with 3 moola
    [0, 0, 0], // Bob starts with nothing
    [0, 0, 0], // Carol starts with nothing
    [0, 7, 1], // Dave starts with 7 simoleans and 1 buck
  ];
  const dump = await runZoeScenario(t, ['swapForOptionOk', startingValues]);
  t.snapshot(dump.log);
});
