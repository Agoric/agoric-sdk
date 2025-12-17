import test from 'ava';
import { id, keccak256, toUtf8Bytes } from 'ethers';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import { encodeAbiParameters } from 'viem';
import {
  createMockGmpExecutionEvent,
  createMockPendingTxOpts,
  mockFetch,
} from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { GMP_ABI } from '../src/axelarscan-utils.ts';

test('handlePendingTx processes GMP transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[chain];
  const type = TxType.GMP;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
  };

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallExecuted(string,(bool,bytes)[])'), // MulticallExecuted event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] MulticallExecuted detected: txId=${txId} contract=${contractAddress} tx=0x123abc`,
    `[${txId}] ✓ MulticallExecuted matches txId: ${txId}`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx logs a time out on a GMP transaction with no matching event', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  opts.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = TxType.GMP;
  const provider = opts.evmProviders[chain];

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
  };

  // Don't emit any matching events - let it timeout

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallExecuted(string,(bool,bytes)[])'), // MulticallExecuted event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 700);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 600,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] ✗ No MulticallStatus or MulticallExecuted found for txId ${txId} within 0.01 minutes`,
    `[${txId}] MulticallExecuted detected: txId=${txId} contract=${contractAddress} tx=0x123abc`,
    `[${txId}] ✓ MulticallExecuted matches txId: ${txId}`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx fails a pendingTx on it finds a failed tx on Axelarscan (live mode)', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  opts.fetch = mockFetch({ txId, status: 'error' });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = TxType.GMP;
  const provider = opts.evmProviders[chain];

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
  };

  // Don't emit any matching events - let it timeout

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallExecuted(string,(bool,bytes)[])'), // MulticallExecuted event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 700);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 600,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] ✗ No MulticallStatus or MulticallExecuted found for txId ${txId} within 0.01 minutes`,
    `[${txId}] Error: Transaction execution failed`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx fails a pendingTx on it finds a failed tx on Axelarscan (lookback mode)', async t => {
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
  const latestBlock = 8;
  const opts = createMockPendingTxOpts(latestBlock);
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago

  const event = createMockGmpExecutionEvent(txId, latestBlock);
  mockProvider.getLogs = async () => [];

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              status: 'error',
              call: {
                transactionHash: '0xabcdef123456',
                returnValues: {
                  messageId: `msg_${txId}`,
                  payload: encodeAbiParameters(GMP_ABI, [
                    { id: txId, calls: [] },
                  ]),
                },
              },
              error: {
                error: {
                  message: 'Execution failed on destination chain',
                },
              },
              executed: {
                transactionHash: '0xexecuted123',
                receipt: {
                  logs: [event],
                },
              },
            },
          ],
        }),
      } as Response;
    },
  });

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
      timeoutMs: 600,
    },
    txTimestampMs,
  );

  const fromBlock = 0;
  const expectedChunkEnd = latestBlock + 1;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${fromBlock}/${fromBlock} → ${expectedChunkEnd} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] No matching MulticallStatus or MulticallExecuted found`,
    `[${txId}] Lookback completed without finding transaction, waiting for live mode`,
    `[${txId}] ✗ No MulticallStatus or MulticallExecuted found for txId ${txId} within 0.01 minutes`,
    `[${txId}] Error: Execution failed on destination chain`,
    `[${txId}] Live mode completed`,
    `[${txId}] GMP tx resolved`,
  ]);
});
