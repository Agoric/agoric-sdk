// @ts-nocheck
/**
 * @file Zoe contract scenarios (ticket/NFT sales + OTC desk). Split from
 * zoe.test.js so each scenario's independent kernel boots on its own core; see
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

test.serial('zoe - sellTickets - valid inputs', async t => {
  const startingValues = [
    [0, 0, 0],
    [22, 0, 0],
  ];
  const dump = await runZoeScenario(t, ['sellTicketsOk', startingValues]);
  t.snapshot(dump.log);
});

test('zoe - otcDesk - valid inputs', async t => {
  const startingValues = [
    [10000, 10000, 10000],
    [10000, 10000, 10000],
  ];
  const dump = await runZoeScenario(t, ['otcDeskOk', startingValues]);
  t.snapshot(dump.log);
});

const expectedBadTimerLog = [
  '=> alice and bob are set up',
  '=> alice.doBadTimer called',
  'is a zoe invitation: true',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
];

// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - bad timer', async t => {
  const startingValues = [
    [3, 0, 0],
    [0, 0, 0],
  ];
  const dump = await runZoeScenario(t, ['badTimer', startingValues]);
  t.deepEqual(dump.log, expectedBadTimerLog);
});
