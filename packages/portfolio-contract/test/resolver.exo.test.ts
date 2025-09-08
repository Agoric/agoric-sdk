/** @file tests for ResolverKit exo */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow/vat.js';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import type { TestFn } from 'ava';
import { TxStatus, TxType } from '../src/resolver/constants.js';
import { prepareResolverKit } from '../src/resolver/resolver.exo.ts';
import type { PublishedTx } from '../src/resolver/types.ts';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';

const test = anyTest as TestFn<{
  nodeUpdates: Record<string, PublishedTx>;
  makeMockNode: (here: string) => StorageNode;
}>;

test.beforeEach(async t => {
  const nodeUpdates: Record<string, PublishedTx> = {};
  const makeMockNode = (here: string) => {
    return harden({
      makeChildNode: (name: string) => makeMockNode(`${here}.${name}`),
      setValue: (value: string) => {
        nodeUpdates[here] = defaultMarshaller.fromCapData(JSON.parse(value));
      },
    }) as unknown as StorageNode;
  };

  t.context = {
    nodeUpdates,
    makeMockNode,
  };
});

test('resolver creates nodes in chain storage on registerTransaction', async t => {
  const { nodeUpdates, makeMockNode } = t.context;
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const zcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const makeResolverKit = prepareResolverKit(zone, zcf, {
    vowTools,
    pendingTxsNode: makeMockNode('pendingTxs'),
    marshaller,
  });

  const { client } = makeResolverKit();

  // Register first transaction
  client.registerTransaction(
    TxType.CCTP_TO_EVM,
    'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
    100n,
  );
  await eventLoopIteration();

  t.deepEqual(
    Object.keys(nodeUpdates),
    ['pendingTxs.tx0'],
    'creates nodes with correct names',
  );

  // Register second transaction
  client.registerTransaction(
    TxType.GMP,
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );
  await eventLoopIteration();

  t.deepEqual(
    Object.keys(nodeUpdates),
    ['pendingTxs.tx0', 'pendingTxs.tx1'],
    'creates additional nodes',
  );
});

test('resolver updates nodes in chain storage on settleTransaction', async t => {
  const { nodeUpdates, makeMockNode } = t.context;

  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const zcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const makeResolverKit = prepareResolverKit(zone, zcf, {
    vowTools,
    pendingTxsNode: makeMockNode('pendingTxs'),
    marshaller,
  });

  const { client, service, reporter } = makeResolverKit();

  // Register transaction
  const tx = client.registerTransaction(
    TxType.CCTP_TO_NOBLE,
    'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
    250n,
  );
  await eventLoopIteration();

  t.is(Object.keys(nodeUpdates).length, 1, 'updates node on registration');
  t.deepEqual(
    nodeUpdates['pendingTxs.tx0'],
    {
      type: TxType.CCTP_TO_NOBLE,
      destinationAddress:
        'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
      status: TxStatus.PENDING,
      amount: 250n,
    },
    'sets correct pending status and data',
  );

  // Settle transaction successfully
  service.settleTransaction({
    status: TxStatus.SUCCESS,
    txId: tx.txId,
  });
  await eventLoopIteration();

  t.is(Object.keys(nodeUpdates).length, 1, 'updates same node on settlement');
  t.deepEqual(
    nodeUpdates['pendingTxs.tx0'],
    {
      destinationAddress:
        'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
      type: TxType.CCTP_TO_NOBLE,
      status: TxStatus.SUCCESS,
      amount: 250n,
    },
    'updates to success status with correct data',
  );
});

test('resolver creates ids in sequence on registerTransaction', async t => {
  const { nodeUpdates, makeMockNode } = t.context;

  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const zcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const makeResolverKit = prepareResolverKit(zone, zcf, {
    vowTools,
    pendingTxsNode: makeMockNode('pendingTxs'),
    marshaller,
  });

  const { client } = makeResolverKit();

  // Register multiple transactions
  const tx1 = client.registerTransaction(
    TxType.CCTP_TO_EVM,
    'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
    100n,
  );

  const tx2 = client.registerTransaction(
    TxType.GMP,
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );

  const tx3 = client.registerTransaction(
    TxType.CCTP_TO_NOBLE,
    'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
    500n,
  );

  t.is(tx1.txId, 'tx0', 'first transaction gets ID tx0');
  t.is(tx2.txId, 'tx1', 'second transaction gets ID tx1');
  t.is(tx3.txId, 'tx2', 'third transaction gets ID tx2');
});

test('resolver creates correct types for different TxTypes', async t => {
  const { nodeUpdates, makeMockNode } = t.context;

  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const zcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const makeResolverKit = prepareResolverKit(zone, zcf, {
    vowTools,
    pendingTxsNode: makeMockNode('pendingTxs'),
    marshaller,
  });

  const { client } = makeResolverKit();

  // Test CCTP transaction with amount
  client.registerTransaction(
    TxType.CCTP_TO_EVM,
    'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
    100n,
  );

  // Test GMP transaction without amount
  client.registerTransaction(
    TxType.GMP,
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );

  // Test CCTP_TO_NOBLE transaction with amount
  client.registerTransaction(
    TxType.CCTP_TO_NOBLE,
    'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
    500n,
  );

  await eventLoopIteration();

  t.deepEqual(
    nodeUpdates['pendingTxs.tx0'],
    {
      type: TxType.CCTP_TO_EVM,
      destinationAddress: 'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
      status: TxStatus.PENDING,
      amount: 100n,
    },
    'CCTP transaction has correct type and includes amount',
  );

  t.deepEqual(
    nodeUpdates['pendingTxs.tx1'],
    {
      type: TxType.GMP,
      destinationAddress:
        'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
      status: TxStatus.PENDING,
    },
    'GMP transaction has correct type and excludes amount',
  );

  t.deepEqual(
    nodeUpdates['pendingTxs.tx2'],
    {
      type: TxType.CCTP_TO_NOBLE,
      destinationAddress:
        'eip155:56:0x1A1ec25DC08e98e5E93F1104B5e5cd73e96cd0De',
      status: TxStatus.PENDING,
      amount: 500n,
    },
    'NOBLE_WITHDRAW transaction has correct type and includes amount',
  );
});

// XXX: figure out why failing settlement crashes the entire transaction.
test.skip('resolver sets status to SUCCESS or FAILED on settlement', async t => {
  const { nodeUpdates, makeMockNode } = t.context;

  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const zcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const makeResolverKit = prepareResolverKit(zone, zcf, {
    vowTools,
    pendingTxsNode: makeMockNode('pendingTxs'),
    marshaller,
  });

  const { client, service } = makeResolverKit();

  // Register transactions
  const successTx = client.registerTransaction(
    TxType.CCTP_TO_EVM,
    'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
    100n,
  );

  const failedTx = client.registerTransaction(
    TxType.GMP,
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );

  await eventLoopIteration();

  // Initial status should be PENDING
  t.deepEqual(
    nodeUpdates['pendingTxs.tx0'],
    {
      type: TxType.CCTP_TO_EVM,
      destinationAddress: 'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
      status: TxStatus.PENDING,
      amount: 100n,
    },
    'first transaction starts as pending with correct data',
  );

  t.deepEqual(
    nodeUpdates['pendingTxs.tx1'],
    {
      type: TxType.GMP,
      destinationAddress:
        'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
      status: TxStatus.PENDING,
    },
    'second transaction starts as pending with correct data',
  );

  // Settle first transaction as SUCCESS
  service.settleTransaction({
    status: TxStatus.SUCCESS,
    txId: successTx.txId,
  });

  // Settle second transaction as FAILED
  service.settleTransaction({
    status: TxStatus.FAILED,
    txId: failedTx.txId,
    rejectionReason: 'Network timeout',
  });

  await eventLoopIteration();

  t.deepEqual(
    nodeUpdates['pendingTxs.tx0'],
    {
      amount: 100n,
      destinationAddress: 'eip155:1:0x742d35Cc6631C0532925a3b8D7389D026f2077c3',
      type: TxType.CCTP_TO_EVM,
      status: TxStatus.SUCCESS,
    },
    'first transaction settles as success with correct data',
  );

  t.deepEqual(
    nodeUpdates['pendingTxs.tx1'],
    {
      destinationAddress:
        'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
      type: TxType.GMP,
      status: TxStatus.FAILED,
    },
    'second transaction settles as failed with correct data',
  );
});
