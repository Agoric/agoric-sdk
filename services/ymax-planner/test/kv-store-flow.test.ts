/**
 * Tests for the functionality of flows involving the KV store
 */
import test from 'ava';

import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import {
  getResolverLastActiveBlock,
  setResolverLastActiveBlock,
} from '../src/kv-store.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { EVENTS } from '../src/watchers/gmp-watcher.ts';
import {
  createMockGmpExecutionEvent,
  createMockPendingTxOpts,
} from './mocks.ts';

test('updates KV store when a pending tx is being searched', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx2' as `tx${number}`;

  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const chainId = 'eip155:42161';
  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1_450_131;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockGmpExecutionEvent(txId);
  mockProvider.getLogs = async (args: {
    fromBlock: number;
    toBlock: number;
  }) => {
    const blockWithEvent = 1_450_080;
    if (blockWithEvent >= args.fromBlock && blockWithEvent <= args.toBlock)
      return [event];
    else return [];
  };

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              status: 'executed',
              call: {
                transactionHash: '0xabcdef123456',
                returnValues: {
                  messageId: `msg_${txId}`,
                },
              },
              executed: {
                transactionHash: '0xexecuted123',
                receipt: {
                  logs: [createMockGmpExecutionEvent(txId)],
                },
              },
            },
          ],
        }),
      } as Response;
    },
  });

  const initialMulticallExecutedSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const initialMulticallStatusSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  t.is(initialMulticallExecutedSavedBlock, undefined);
  t.is(initialMulticallStatusSavedBlock, undefined);

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
    },
    txTimestampMs,
  );

  const finalMulticallExecutedSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalMulticallStatusSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  t.is(finalMulticallExecutedSavedBlock, 1450079);
  t.is(finalMulticallStatusSavedBlock, 1450079);

  console.log(logs);
});

test('begins searching from block number stored in kv store', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx2' as `tx${number}`;

  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const chainId = 'eip155:42161';
  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1449553;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockGmpExecutionEvent(txId);
  mockProvider.getLogs = async (args: {
    fromBlock: number;
    toBlock: number;
  }) => {
    const blockWithEvent = 1449540;
    if (blockWithEvent >= args.fromBlock && blockWithEvent <= args.toBlock)
      return [event];
    else return [];
  };

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              status: 'executed',
              call: {
                transactionHash: '0xabcdef123456',
                returnValues: {
                  messageId: `msg_${txId}`,
                },
              },
              executed: {
                transactionHash: '0xexecuted123',
                receipt: {
                  logs: [createMockGmpExecutionEvent(txId)],
                },
              },
            },
          ],
        }),
      } as Response;
    },
  });

  const lastActiveBlock = 1449524;
  await setResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    lastActiveBlock,
    EVENTS.MULTICALL_EXECUTED,
  );
  await setResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    lastActiveBlock,
    EVENTS.MULTICALL_STATUS,
  );

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
    },
    txTimestampMs,
  );

  const finalMulticallExecutedSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalMulticallStatusSavedBlock = await getResolverLastActiveBlock(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  const finalBlock = 1449533;
  t.is(finalMulticallExecutedSavedBlock, finalBlock);
  t.is(finalMulticallStatusSavedBlock, finalBlock);

  t.deepEqual(logs, [
    `[${txId}] handling GMP tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks 1449524/1449524 → 1449553 for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${lastActiveBlock} → ${finalBlock}`,
    `[${txId}] [LogScan] Searching chunk ${lastActiveBlock} → ${finalBlock}`,
    `[${txId}] [LogScan] Searching chunk 1449534 → 1449543`,
    `[${txId}] [LogScan] Searching chunk 1449534 → 1449543`,
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] Found matching event`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] GMP tx resolved`,
  ]);
});
