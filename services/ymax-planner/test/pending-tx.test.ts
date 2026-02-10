import test from 'ava';
import { ethers } from 'ethers';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { objectMap } from '@endo/patterns';
import type { WebSocketProvider } from 'ethers';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type {
  PendingTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import {
  processPendingTxEvents,
  processInitialPendingTransactions,
} from '../src/engine.ts';
import {
  createMockPendingTxOpts,
  createMockPendingTxEvent,
  createMockStreamCell,
  createMockTransferEvent,
  createMockGmpStatusEvent,
} from './mocks.ts';

const marshaller = boardSlottingMarshaller();

const makeMockHandlePendingTx = () => {
  const handledTxs: PendingTx[] = [];
  const mockHandlePendingTx = async (
    tx: PendingTx,
    { log: _log, ..._evmCtx }: any,
  ) => {
    handledTxs.push(tx);
  };
  return { mockHandlePendingTx, handledTxs };
};

// --- Unit tests for processPendingTxEvents ---
test('processPendingTxEvents handles valid single transaction event', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();

  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await processPendingTxEvents(
    events,
    mockHandlePendingTx,
    createMockPendingTxOpts(),
  );

  t.is(handledTxs.length, 1);
  t.like(handledTxs[0], {
    txId: 'tx1',
    type: TxType.CCTP_TO_EVM,
    status: 'pending',
  });
});

test('processPendingTxEvents handles multiple transaction events', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();

  const originalCctpData = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
  });
  const originalGmpData = createMockPendingTxData({ type: TxType.GMP });

  const cctpCapData = marshaller.toCapData(originalCctpData);
  const gmpCapData = marshaller.toCapData(originalGmpData);

  const events = [
    createMockPendingTxEvent(
      'tx1',
      JSON.stringify(createMockStreamCell([JSON.stringify(cctpCapData)])),
    ),
    createMockPendingTxEvent(
      'tx2',
      JSON.stringify(createMockStreamCell([JSON.stringify(gmpCapData)])),
    ),
  ];

  await processPendingTxEvents(
    events,
    mockHandlePendingTx,
    createMockPendingTxOpts(),
  );

  t.is(handledTxs.length, 2);
  t.like(handledTxs[0], { txId: 'tx1', type: TxType.CCTP_TO_EVM });
  t.like(handledTxs[1], { txId: 'tx2', type: TxType.GMP });
});

test('processPendingTxEvents errors do not disrupt processing valid transactions', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();

  const validTx1 = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const validTx2 = createMockPendingTxData({ type: TxType.GMP });
  const invalidTxData = harden({
    status: 'pending',
    // Missing: type, amount, destinationAddress
    someOtherField: 'invalid',
  });

  const validCapData1 = marshaller.toCapData(validTx1);
  const validCapData2 = marshaller.toCapData(validTx2);
  const invalidCapData = marshaller.toCapData(invalidTxData);

  const events = [
    createMockPendingTxEvent(
      'tx1',
      JSON.stringify(createMockStreamCell([JSON.stringify(validCapData1)])),
    ),
    createMockPendingTxEvent(
      'tx2',
      JSON.stringify(createMockStreamCell([JSON.stringify(invalidCapData)])),
    ),
    createMockPendingTxEvent(
      'tx3',
      JSON.stringify({ values: [JSON.stringify(validCapData2)] }),
    ),
    createMockPendingTxEvent(
      'tx4',
      JSON.stringify(createMockStreamCell([JSON.stringify(validCapData2)])),
    ),
  ];

  const errorLog = [] as Array<any[]>;
  await processPendingTxEvents(events, mockHandlePendingTx, {
    ...createMockPendingTxOpts(),
    error: (...args) => errorLog.push(args),
  });
  if (errorLog.length !== 2) {
    t.log(errorLog);
  }
  t.is(errorLog.length, 2);
  t.regex(errorLog[0].at(-1).message, /\btx2\b/);
  t.regex(
    errorLog[1].at(-1).message,
    /\btx3\b.*Must have missing properties.*blockHeight/,
  );

  t.is(handledTxs.length, 2);
});

test('processPendingTxEvents handles only pending transactions', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();

  const tx1 = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const tx2 = createMockPendingTxData({ type: TxType.GMP, status: 'success' });

  const data1 = marshaller.toCapData(tx1);
  const data2 = marshaller.toCapData(tx2);

  const events = [
    createMockPendingTxEvent(
      'tx1',
      JSON.stringify(createMockStreamCell([JSON.stringify(data2)])),
    ),
    createMockPendingTxEvent(
      'tx2',
      JSON.stringify(createMockStreamCell([JSON.stringify(data1)])),
    ),
  ];

  await processPendingTxEvents(
    events,
    mockHandlePendingTx,
    createMockPendingTxOpts(),
  );

  t.is(handledTxs.length, 1);
  t.is(handledTxs[0].status, 'pending');
});

// --- Unit tests for handlePendingTx ---
test('handlePendingTx prints error for unsupported transaction type', async t => {
  const mockLog = () => {};

  const unsupportedTx = {
    txId: 'tx3' as `tx${number}`,
    type: 'cctpV2',
    status: 'pending',
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  } as any;

  const errorLog: Array<any[]> = [];
  await handlePendingTx(unsupportedTx, {
    ...createMockPendingTxOpts(),
    log: mockLog,
    error: (...args: unknown[]) => {
      errorLog.push(args);
    },
  });
  t.deepEqual(errorLog, [
    [
      `🚨 [${unsupportedTx.txId}] No monitor registered for tx type: ${unsupportedTx.type}`,
    ],
  ]);
});

test('resolves a 31 min old pending CCTP transaction in lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 31 * 60 * 1000; // 31 min ago
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockTransferEvent(
    opts.usdcAddresses[chainId],
    txAmount,
    recipientAddress,
  );
  mockProvider.getLogs = async () => [event];

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1442834;
  const toBlock = currentBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('resolves a 28 min old pending CCTP transaction in lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 28 * 60 * 1000; // 28 min ago
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockTransferEvent(
    opts.usdcAddresses[chainId],
    txAmount,
    recipientAddress,
  );
  mockProvider.getLogs = async () => [event];

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1443434;
  const toBlock = currentBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('resolves a transaction published at current time in lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs; // published exactly now
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockTransferEvent(
    opts.usdcAddresses[chainId],
    txAmount,
    recipientAddress,
  );
  mockProvider.getLogs = async () => [event];

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1449034;
  const toBlock = currentBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('resolves a 10 second old pending CCTP transaction in lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago
  const avgBlockTimeMs = 300; // 300 ms per block on eip155:42161

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockTransferEvent(
    opts.usdcAddresses[chainId],
    txAmount,
    recipientAddress,
  );
  mockProvider.getLogs = async () => [event];

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1449000;
  const toBlock = currentBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('resolves a 10 second old pending GMP transaction in lookback mode', async t => {
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

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockGmpStatusEvent(txId, latestBlock);
  mockProvider.getLogs = async () => [event];

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      if (Object.values(opts.rpcUrls).includes(url)) {
        return {
          ok: true,
          json: async () => [
            {
              result: [],
            },
          ],
        } as Response;
      }
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
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1449000;
  const toBlock = currentBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] [FailedTxScan] Aborted`,
    `[${txId}] Found matching event`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] GMP tx resolved`,
  ]);
});

// --- Tests for processInitialPendingTransactions ---

test('processInitialPendingTransactions handles transactions with lookback', async t => {
  const handledCalls: Array<{ tx: any; opts: any }> = [];
  const txId: TxId = 'tx1';

  const mockHandlePendingTx = async (tx: any, opts: any) => {
    handledCalls.push({ tx, opts });
    if (opts.txTimestampMs) {
      logs.push('Processing old tx');
    }
  };

  const oldTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: 1000000n,
    destinationAddress:
      'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  });

  const pendingTxRecords = [
    {
      blockHeight: 1000n,
      tx: { txId, ...oldTx },
    },
  ];

  const logs: string[] = [];
  const txTimeMs = 25 * 60 * 1000; // 25 minutes ago
  const txPowers = {
    ...createMockPendingTxOpts(),
    log: (...args: unknown[]) => logs.push(args.join(' ')),
    cosmosRpc: {
      request: async () => {
        const oldTime = new Date(Date.now() - txTimeMs);
        return {
          block: {
            header: {
              time: oldTime.toISOString(),
            },
          },
        };
      },
    } as any,
  };

  await processInitialPendingTransactions(
    pendingTxRecords,
    txPowers,
    mockHandlePendingTx,
  );

  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  t.is(handledCalls.length, 1);
  t.deepEqual(logs, [
    'Processing 1 pending transactions',
    `Processing pending tx ${txId} with lookback`,
    'Processing old tx',
  ]);
});

test('processInitialPendingTransactions handles transactions with age < 20min in lookback mode', async t => {
  const handledCalls: Array<{ tx: any; opts: any }> = [];
  const txId: TxId = 'tx2';
  const logs: string[] = [];

  const mockHandlePendingTx = async (tx: any, opts: any) => {
    handledCalls.push({ tx, opts });
    if (opts.txTimestampMs) {
      logs.push('Processing old tx');
    }
  };

  const newTx = createMockPendingTxData({
    type: TxType.GMP,
    amount: 500000n,
    destinationAddress: 'eip155:1:0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
  });

  const pendingTxRecords = [
    {
      blockHeight: 2000n,
      tx: { txId, ...newTx },
    },
  ];

  const txTimeMs = 2 * 60 * 1000; // 2 minutes ago
  const txPowers = {
    ...createMockPendingTxOpts(),
    cosmosRpc: {
      request: async () => {
        const oldTime = new Date(Date.now() - txTimeMs);
        return {
          block: {
            header: {
              time: oldTime.toISOString(),
            },
          },
        };
      },
    } as any,
    log: (...args: unknown[]) => logs.push(args.join(' ')),
  };

  await processInitialPendingTransactions(
    pendingTxRecords,
    txPowers,
    mockHandlePendingTx,
  );

  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  t.is(handledCalls.length, 1);
  t.deepEqual(logs, [
    'Processing 1 pending transactions',
    `Processing pending tx ${txId} with lookback`,
    'Processing old tx',
  ]);
});

test('GMP monitor does not resolve transaction twice when live mode completes before lookback', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx999' as `tx${number}`;

  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const chainId = 'eip155:42161';
  const latestBlock = 1000;
  const opts = createMockPendingTxOpts(latestBlock);
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000;
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago

  // Track executeOffer calls to detect duplicate resolution
  const executeOfferCalls: any[] = [];
  const originalExecuteOffer = opts.signingSmartWalletKit.executeOffer;
  opts.signingSmartWalletKit.executeOffer = async (offerSpec: any) => {
    executeOfferCalls.push({
      timestamp: Date.now(),
      offerArgs: offerSpec.offerArgs,
    });
    return originalExecuteOffer(offerSpec);
  };

  // Make lookback return nothing (simulate not finding the transaction)
  mockProvider.getLogs = async () => [];

  // Create event for MulticallStatus
  const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
  const event = {
    address: contractAddress,
    topics: [
      ethers.id('MulticallStatus(string,bool,uint256)'),
      expectedIdTopic,
    ],
    data: '0x',
    blockNumber: latestBlock + 2,
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
    txId, // Include txId for websocket message simulation
  };

  // Simulate live mode finding the transaction quickly (before lookback completes)
  setTimeout(() => {
    const filter = {
      address: contractAddress,
      topics: [
        ethers.id('MulticallStatus(string,bool,uint256)'),
        expectedIdTopic,
      ],
    };
    mockProvider.emit(filter, event);
  }, 50);

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (_url: string) => {
      // Axelarscan returns executed status
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
      timeoutMs: 5000,
      txTimestampMs,
    },
  );

  // Regression test: Ensure transaction is resolved exactly once, not twice.
  // The bug being tested: When both live mode and lookback mode find the same
  // transaction, both would attempt to resolve it - once when live mode's
  // .then() handler detects success, and again at the end after lookback completes.
  t.is(
    executeOfferCalls.length,
    1,
    `Expected 1 resolution, but got ${executeOfferCalls.length}. This indicates the race condition bug where the transaction is resolved twice.`,
  );

  if (executeOfferCalls.length > 1) {
    t.log('Multiple resolution calls detected:');
    executeOfferCalls.forEach((call, index) => {
      t.log(`  Call ${index + 1}:`, call.offerArgs);
    });
  }
});

test('find a failed tx in lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx553' as `tx${number}`;

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

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const event = createMockGmpStatusEvent(txId, latestBlock);
  mockProvider.getLogs = async () => [event];

  // Providers that will return our failed tx.
  // getLogs returns [] so the parallel log scanner finds nothing and the
  // failed-tx scanner is the one that produces the result.
  const newEvmProviders = objectMap(
    opts.evmProviders,
    provider =>
      ({
        ...provider,
        getLogs: async () => [],
        getTransaction: async _ => {
          return {
            // from: https://arbiscan.io/tx/0xfbafaf0a9949fa657c9a040b0afa0ce0b09299c18e7c395ad8e651aa1c207174
            data: '0x4916065815265253afd6756fd6267d42728a7e9826de81fab3245a183b3ea57beeaa8100000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000661676f7269630000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004161676f72696331386434377263666a30673472376a37797679706d34346b71637a6c346a72667436757032333370397a7639357038757434396d71756667687a680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000057478353533000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000100000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000019330d10d9cc8751218eaf51e8885d058642e08a00000000000000000000000000000000000000000000000000000000002059400000000000000000000000000000000000000000000000000000000000000000000000000000000019330d10d9cc8751218eaf51e8885d058642e08a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000846fd3504e000000000000000000000000000000000000000000000000000000000020594000000000000000000000000000000000000000000000000000000000000000040000000000000000000000001cd706e62703fa99ce0b3f477fad138cb1954cd0000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000',
          };
        },
      }) as unknown as WebSocketProvider,
  );

  const ctxWithFetch = harden({
    ...opts,
    evmProviders: newEvmProviders,
    fetch: async (url: string) => {
      // Return receipt with failed status
      if (Object.values(opts.rpcUrls).includes(url)) {
        return {
          ok: true,
          json: async () => [
            {
              result: [
                {
                  transactionHash: '0x123123213',
                  status: '0x0',
                  to: contractAddress,
                },
              ],
            },
          ],
        } as Response;
      }
      return {} as Response;
    },
  });

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
      txTimestampMs,
    },
  );

  const currentBlock = await mockProvider.getBlockNumber();
  const fromBlock = 1449000;
  const toBlock = currentBlock;

  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);
  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 10} → ${expectedChunkEnd + 10}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 20} → ${expectedChunkEnd + 20}`,
    `[${txId}] [LogScan] Aborted`,
    `[${txId}] Found matching failed transaction`,
    `[${txId}] Lookback found transaction`,
    `[${txId}] GMP tx resolved`,
  ]);
});
