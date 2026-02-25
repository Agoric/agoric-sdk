/**
 * Tests for the functions that involve the use of `getTxBlockLowerBound` and `setTxBlockLowerBound`
 */
import test from 'ava';

import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import { getTxBlockLowerBound, setTxBlockLowerBound } from '../src/kv-store.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { MULTICALL_STATUS_EVENT } from '../src/watchers/gmp-watcher.ts';
import { createMockGmpStatusEvent, createMockPendingTxOpts } from './mocks.ts';

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

  const event = createMockGmpStatusEvent(txId, blockWithEvent);
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

  const initialStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    MULTICALL_STATUS_EVENT,
  );

  t.is(initialStatusBlockSaved, undefined);

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctx,
      log: mockLog,
      txTimestampMs,
    },
  );

  const finalStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    MULTICALL_STATUS_EVENT,
  );

  // final blocks saved in kvstore should be deleted after success
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

  // Set starting lower bound for status events
  const statusLowerBound = 87;
  await setTxBlockLowerBound(
    ctx.kvStore,
    txId,
    statusLowerBound,
    MULTICALL_STATUS_EVENT,
  );

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctx,
      log: mockLog,
      txTimestampMs,
    },
  );

  const finalStatusBlockSaved = await getTxBlockLowerBound(
    ctx.kvStore,
    txId,
    MULTICALL_STATUS_EVENT,
  );

  // final blocks saved in kvstore should be deleted after success
  t.is(finalStatusBlockSaved, undefined);

  t.true(logs.some(l => l.includes('handling GMP tx')));
  t.true(logs.some(l => l.includes('Lookback found transaction')));
  t.true(logs.some(l => l.includes('GMP tx resolved')));
});
