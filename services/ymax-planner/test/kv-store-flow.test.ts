/**
 * Tests for the functionality of flows involving the KV store
 */
import test from 'ava';

import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import { getTxBlockLowerBound, setTxBlockLowerBound } from '../src/kv-store.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { EVENTS } from '../src/watchers/gmp-watcher.ts';
import {
  createMockGmpExecutionEvent,
  createMockPendingTxOpts,
} from './mocks.ts';

const setupEnvironment = ({
  latestBlock,
  blockWithEvent,
  txId,
  contractAddress,
}) => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const destinationAddress: `${string}:${string}:${string}` = `eip155:42161:${contractAddress}`;

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

  return {
    ctxWithFetch,
    gmpTx,
    mockLog,
    logs,
    txTimestampMs,
  };
};

test('updates KV store when a pending tx is being searched', async t => {
  const latestBlock = 100;
  const txId = 'tx2';
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';

  const { ctxWithFetch, gmpTx, mockLog, txTimestampMs } = setupEnvironment({
    contractAddress,
    latestBlock,
    blockWithEvent: 99,
    txId,
  });

  const initialMulticallExecutedSavedBlock = await getTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const initialMulticallStatusSavedBlock = await getTxBlockLowerBound(
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

  const finalMulticallExecutedSavedBlock = await getTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalMulticallStatusSavedBlock = await getTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  t.is(finalMulticallExecutedSavedBlock, 89);
  t.is(finalMulticallStatusSavedBlock, 89);
});

test('begins searching from block number stored in kv store', async t => {
  const latestBlock = 100;
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx2';

  const { ctxWithFetch, gmpTx, mockLog, logs, txTimestampMs } =
    setupEnvironment({
      contractAddress,
      latestBlock,
      blockWithEvent: 99,
      txId,
    });

  const executedLowerBound = 83;
  const statusLowerBound = 87;
  await setTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    executedLowerBound,
    EVENTS.MULTICALL_EXECUTED,
  );
  await setTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    statusLowerBound,
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

  const finalMulticallExecutedSavedBlock = await getTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalMulticallStatusSavedBlock = await getTxBlockLowerBound(
    ctxWithFetch.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  const executedFinalBlock = 92;
  const statusFinalBlock = 96;
  t.is(finalMulticallExecutedSavedBlock, executedFinalBlock);
  t.is(finalMulticallStatusSavedBlock, statusFinalBlock);

  t.deepEqual(logs, [
    `[${txId}] handling GMP tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${statusLowerBound}/${executedLowerBound} → ${latestBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${statusLowerBound} → ${statusFinalBlock}`,
    `[${txId}] [LogScan] Searching chunk ${executedLowerBound} → ${executedFinalBlock}`,
    `[${txId}] [LogScan] Searching chunk ${statusLowerBound + 10} → ${latestBlock}`,
    `[${txId}] [LogScan] Searching chunk ${executedLowerBound + 10} → ${latestBlock}`,
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] Found matching event`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] GMP tx resolved`,
  ]);
});
