/**
 * Tests for the functions that involve the use of `getTxBlockLowerBound` and `setTxBlockLowerBound`
 */
import test from 'ava';

import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import { getTxBlockLowerBound, setTxBlockLowerBound } from '../src/kv-store.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { EVENTS } from '../src/watchers/gmp-watcher.ts';
import {
  createMockGmpExecutionEvent,
  createMockPendingTxOpts,
} from './mocks.ts';

/**
 * Sets up a test environment for testing transaction block lower bound functionality.
 *
 * Mocks of all the utilities required by `handlePendingTx`:
 * - EVM providers
 * - Events associated with the providers
 * - GMP tx data
 * - logger utility
 */
const setupEnvironment = ({
  latestBlock,
  blockWithEvent,
  txId,
  contractAddress,
}: {
  latestBlock: number;
  blockWithEvent: number;
  txId: `tx${number}`;
  contractAddress: string;
}) => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const chainId: CaipChainId = 'eip155:42161';
  const destinationAddress: AccountId = `${chainId}:${contractAddress}`;
  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const event = createMockGmpExecutionEvent(txId, blockWithEvent);
  const opts = createMockPendingTxOpts(latestBlock, [event]);
  const mockProvider = opts.evmProviders[chainId];

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago
  // Trigger block event to resolve waitForBlock
  setTimeout(async () => {
    latestBlock += 1;
    await mockProvider.emit('block', latestBlock);
  }, 10);

  return {
    ctx: opts,
    gmpTx,
    mockLog,
    logs,
    txTimestampMs,
  };
};

test('updates lower bound when a pending tx is being searched', async t => {
  const txId = 'tx2';
  const { ctx, gmpTx, mockLog, txTimestampMs } = setupEnvironment({
    contractAddress: '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
    txId,
    latestBlock: 100,
    blockWithEvent: 99,
  });

  const initialExecutedBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const initialStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  t.is(initialExecutedBlockSaved, undefined);
  t.is(initialStatusBlockSaved, undefined);

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctx,
      log: mockLog,
    },
    txTimestampMs,
  );

  const finalExecutedBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  // final blocks saved in kvstore should be deleted after success
  t.is(finalExecutedBlockSaved, undefined);
  t.is(finalStatusBlockSaved, undefined);
});

test('begins searching from the lower bound block number stored in kv store', async t => {
  const latestBlock = 100;
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx2';

  const { ctx, gmpTx, mockLog, logs, txTimestampMs } = setupEnvironment({
    contractAddress,
    latestBlock,
    blockWithEvent: 99,
    txId,
  });

  // Arbitrarty different starting lower bounds
  const executedLowerBound = 83;
  const statusLowerBound = 87;
  await setTxBlockLowerBound(
    ctx.kvStore,
    txId,
    executedLowerBound,
    EVENTS.MULTICALL_EXECUTED,
  );
  await setTxBlockLowerBound(
    ctx.kvStore,
    txId,
    statusLowerBound,
    EVENTS.MULTICALL_STATUS,
  );

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctx,
      log: mockLog,
    },
    txTimestampMs,
  );

  const finalExecutedBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_EXECUTED,
  );
  const finalStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    EVENTS.MULTICALL_STATUS,
  );

  // handlePendingTx will search in chunks of 10 blocks
  // since the expected event should be found in the second block we search,
  // The final block saved should be the tail of the previous chunk
  const executedFinalBlock = executedLowerBound + 9;
  const statusFinalBlock = statusLowerBound + 9;

  // final blocks saved in kvstore should be deleted after success
  t.is(finalExecutedBlockSaved, undefined);
  t.is(finalStatusBlockSaved, undefined);

  // latestBlock has incremented by one in this entire process
  const newLatestBlock = latestBlock + 1;
  t.deepEqual(logs, [
    `[${txId}] handling GMP tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${statusLowerBound}/${executedLowerBound} → ${newLatestBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${statusLowerBound} → ${statusFinalBlock}`,
    `[${txId}] [LogScan] Searching chunk ${executedLowerBound} → ${executedFinalBlock}`,
    // Next chunk start one after where the previous chunk ended
    `[${txId}] [LogScan] Searching chunk ${statusFinalBlock + 1} → ${newLatestBlock}`,
    `[${txId}] [LogScan] Searching chunk ${executedFinalBlock + 1} → ${newLatestBlock}`,
    // Our mock event matches both, so we expect to find a match in each
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] [LogScan] Match in tx=0x1234567890abcdef1234567890abcdef12345678`,
    `[${txId}] Found matching event`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] GMP tx resolved`,
  ]);
});
