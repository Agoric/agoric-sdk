import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  addTrafficEntries,
  finishTrafficEntries,
  trafficTransforms,
} from '../../src/utils/orchestrationAccount.js';
import type { TrafficEntry } from '../../src/cosmos-api.ts';

test('finishTrafficEntries - empty traffic, no slice descriptor', t => {
  const result = finishTrafficEntries(undefined, undefined, entries => entries);
  t.deepEqual(result, [], 'returns empty array');
});

test('finishTrafficEntries - empty traffic, explicit empty slice', t => {
  const result = finishTrafficEntries(
    [],
    { start: 0, end: 0 },
    entries => entries,
  );
  t.deepEqual(result, [], 'returns empty array');
});

test('finishTrafficEntries - non-empty traffic, empty slice', t => {
  const traffic = [{ op: 'transfer', seq: 1 }] as TrafficEntry[];
  const result = finishTrafficEntries(
    traffic,
    { start: 1, end: 1 },
    entries => entries,
  );
  t.deepEqual(result, traffic, 'returns original traffic unchanged');
});

test('finishTrafficEntries - normal case with transformation', t => {
  const traffic = [
    { op: 'transfer', seq: { status: 'pending' } },
  ] as TrafficEntry[];
  const result = finishTrafficEntries(traffic, { start: 0, end: 1 }, entries =>
    entries.map(e => ({ ...e, seq: 123 })),
  );
  t.is(result.length, 1, 'has one entry');
  t.is(result[0].seq, 123, 'transformation applied correctly');
});

test('finishTrafficEntries - IBC transfer transformation', t => {
  const srcChain = 'cosmos:agoric-3';
  const dstChain = 'cosmos:noble-1';
  const transferChannel = {
    portId: 'transfer',
    channelId: 'channel-62',
    counterPartyPortId: 'transfer',
    counterPartyChannelId: 'channel-21',
  } as const;

  // Start an IBC transfer (creates incomplete entry)
  const incompleteEntries = trafficTransforms.IbcTransfer.start(
    srcChain,
    dstChain,
    transferChannel,
  );
  t.is(incompleteEntries.length, 1, 'created one incomplete entry');
  t.is(incompleteEntries[0].incomplete, true, 'entry is marked incomplete');
  t.deepEqual(
    incompleteEntries[0].seq,
    { status: 'pending' },
    'sequence is pending',
  );

  // Add to traffic
  const { traffic, slice } = addTrafficEntries(undefined, incompleteEntries);
  t.is(traffic.length, 1, 'traffic has one entry');
  t.deepEqual(slice, { start: 0, end: 1 }, 'slice covers the new entry');

  // Finish with sequence number
  const sequence = 7;
  const finishedTraffic = finishTrafficEntries(traffic, slice, entries =>
    trafficTransforms.IbcTransfer.finish(entries, sequence),
  );

  t.is(finishedTraffic.length, 1, 'finished traffic has one entry');
  t.is(finishedTraffic[0].seq, sequence, 'sequence number updated');
  t.is(finishedTraffic[0].incomplete, undefined, 'incomplete flag removed');
});

test('addTrafficEntries - adds to empty traffic', t => {
  const newEntries = [
    { src: ['ibc'], dst: ['ibc'], op: 'transfer', seq: 1 },
  ] as const satisfies TrafficEntry[];
  const { traffic, slice } = addTrafficEntries(undefined, newEntries);
  t.deepEqual(traffic, newEntries, 'traffic contains new entries');
  t.deepEqual(slice, { start: 0, end: 1 }, 'slice covers new entries');
});

test('addTrafficEntries - appends to existing traffic', t => {
  const priorTraffic = [
    { src: ['ibc'], dst: ['ibc'], op: 'transfer', seq: 1 },
  ] as const satisfies TrafficEntry[];
  const newEntries = [
    { src: ['ibc'], dst: ['ibc'], op: 'transfer', seq: 2 },
  ] as const satisfies TrafficEntry[];
  const { traffic, slice } = addTrafficEntries(priorTraffic, newEntries);
  t.is(traffic.length, 2, 'traffic has two entries');
  t.deepEqual(
    traffic,
    [...priorTraffic, ...newEntries],
    'traffic is as expected',
  );
  t.deepEqual(slice, { start: 1, end: 2 }, 'slice covers only new entry');
});
