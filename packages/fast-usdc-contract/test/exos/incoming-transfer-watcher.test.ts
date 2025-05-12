import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import type { Denom } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.ts';
import type { IBCChannelID } from '@agoric/vats';
import { prepareVowTools, type VowKit, type VowTools } from '@agoric/vow';
import { makeHeapZone, type Zone } from '@agoric/zone';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  prepareIncomingTransferWatcher,
  type IncomingTransferWatcherConfig,
} from '../../src/exos/incoming-transfer-watcher.ts';

const test = anyTest as TestFn<{
  defaultConfig: IncomingTransferWatcherConfig;
  powers: { vowTools: VowTools };
  zone: Zone;
}>;

test.beforeEach(t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);

  const powers = harden({ vowTools });
  const defaultConfig = harden({
    sourceChannel: 'channel-0' as IBCChannelID,
    remoteDenom: 'ufoo' as Denom,
    cacheLimit: 5,
    incomingTransfers: zone
      .detached()
      .setStore('incomingTransfers') as SetStore<bigint>,
    sequenceToVowKit: zone
      .detached()
      .mapStore('sequenceToResolvers') as MapStore<bigint, VowKit>,
  });
  t.context = {
    defaultConfig,
    powers,
    zone,
  };
});

test('only stores `cacheLimit` incoming transfers', t => {
  const { defaultConfig, powers, zone } = t.context;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  // create 6 events, one more than `cacheLimit`
  const mockVTransferEvents = Array(6)
    .fill(undefined)
    .map((_, i) =>
      buildVTransferEvent({
        sourceChannel: defaultConfig.sourceChannel,
        denom: defaultConfig.remoteDenom,
        sequence: BigInt(i + 1),
      }),
    )
    // reverse, so 6n is observed first
    .reverse();

  // simulate 6 incoming vtransfer events
  for (const event of mockVTransferEvents) {
    watcher.tap.receiveUpcall(event);
  }
  const { incomingTransfers } = defaultConfig;
  t.is(incomingTransfers?.getSize(), 5);
});

test.failing('cache logic removes by insertion order', t => {
  const { defaultConfig, powers, zone } = t.context;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  // create 6 events, one more than `cacheLimit`
  const mockVTransferEvents = Array(6)
    .fill(undefined)
    .map((_, i) =>
      buildVTransferEvent({
        sourceChannel: defaultConfig.sourceChannel,
        denom: defaultConfig.remoteDenom,
        sequence: BigInt(i + 1),
      }),
    )
    // reverse, so 6n is observed first
    .reverse();

  // simulate 6 incoming vtransfer events
  for (const event of mockVTransferEvents) {
    watcher.tap.receiveUpcall(event);
  }
  const { incomingTransfers } = defaultConfig;
  // FIXME - insertion order not preserved?
  t.false(incomingTransfers!.has(6n), 'earliest insertion is removed');
  t.true(incomingTransfers!.has(5n), 'second earliest insertion preserved');
});

test('ignores packets for other channel or denom', t => {
  const { defaultConfig, powers, zone } = t.context;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  // uninterested channel
  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: 'channel-404',
      denom: defaultConfig.remoteDenom,
      sequence: 1n,
    }),
  );

  // uninterested denom
  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: defaultConfig.sourceChannel,
      denom: 'uidk',
      sequence: 2n,
    }),
  );

  t.is(defaultConfig.incomingTransfers!.getSize(), 0, 'packets are ignored');
});

test('resolves if ack seen before waitForAck', async t => {
  const { defaultConfig, powers, zone } = t.context;
  const { when } = powers.vowTools;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  // ICA (CosmosOrchAccount) calls `.transfer()`, target is an LCA (LocalOrchAccount)

  // The VTransfer event (tokens) is received before the ICA packet settles
  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: defaultConfig.sourceChannel,
      denom: defaultConfig.remoteDenom,
      sequence: 10n,
    }),
  );

  // `.transfer()` settles with a sequence of 10n. Ask `TransferWatcher` to let
  // us know when the acknowledgement is received
  t.is(
    await when(watcher.public.waitForAck(10n)),
    undefined,
    'ackVow resolves with with no value to signify success',
  );
});

test('resolves when ack arrives after waitForAck', async t => {
  const { defaultConfig, powers, zone } = t.context;
  const { when } = powers.vowTools;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  // ICA (CosmosOrchAccount) calls `.transfer()`, target is an LCA (LocalOrchAccount)
  // `.transfer()` settles with a sequence of 7n
  const sequence = 7n;

  // Ask `TransferWatcher` to let us know when the acknowledgement is received
  const ackV = watcher.public.waitForAck(sequence);

  // Tokens arrive, VTransfer event is received
  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: defaultConfig.sourceChannel,
      denom: defaultConfig.remoteDenom,
      sequence,
    }),
  );

  t.is(
    await when(ackV),
    undefined,
    'ackVow resolves with with no value to signify success',
  );
});

test('only resolves once for duplicate waitForAck calls', async t => {
  const { defaultConfig, powers, zone } = t.context;
  const { when } = powers.vowTools;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  const firstAckV = watcher.public.waitForAck(30n);
  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: 'channel-0',
      denom: 'ufoo',
      sequence: 30n,
    }),
  );
  t.is(await when(firstAckV), undefined);

  const secondAckV = watcher.public.waitForAck(30n);
  await eventLoopIteration();

  // XXX is there a better way to show `secondAckV` will never resolve?
  // `expectUnhandled(1)` doesn't work since the vow doesn't reject
  // const expectUnhandled = makeExpectUnhandledRejection({ test, importMetaUrl: import.meta.url });
  const winner = await Promise.race([
    when(secondAckV),
    new Promise(resolve => setTimeout(() => resolve('not secondAckV'), 100)),
  ]);
  t.is(winner, 'not secondAckV');
});

test('resolves multiple waitForAcks if called before ack arrives', async t => {
  const { defaultConfig, powers, zone } = t.context;
  const { when } = powers.vowTools;
  const makeIncomingTransferWatcher = prepareIncomingTransferWatcher(
    zone,
    powers,
    defaultConfig,
  );
  const watcher = makeIncomingTransferWatcher();

  const firstAckV = watcher.public.waitForAck(30n);
  const secondAckV = watcher.public.waitForAck(30n);
  // console should print warning: already have a resolver registered for
  // this sequence; exo assumes it will only be awaited once

  watcher.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: 'channel-0',
      denom: 'ufoo',
      sequence: 30n,
    }),
  );

  t.is(await when(firstAckV), undefined);
  t.is(await when(secondAckV), undefined);
});
