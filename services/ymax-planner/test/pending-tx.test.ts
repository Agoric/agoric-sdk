import test from 'ava';
import { boardSlottingMarshaller } from '@agoric/client-utils';
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
  createMockGmpExecutionEvent,
} from './mocks.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type {
  PendingTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';

const marshaller = boardSlottingMarshaller();

const makeMockHandlePendingTx = () => {
  const handledTxs: PendingTx[] = [];
  const mockHandlePendingTx = async (
    tx: PendingTx,
    { log: any, ...evmCtx }: any,
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

test('processPendingTxEvents handles Noble withdraw transactions', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();

  const nobleWithdrawData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 1_000_000n,
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });

  const capData = marshaller.toCapData(nobleWithdrawData);
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
    type: TxType.CCTP_TO_NOBLE,
    status: 'pending',
    amount: 1_000_000n,
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });
});

// --- Unit tests for handlePendingTx ---
test('handlePendingTx throws error for unsupported transaction type', async t => {
  const mockLog = () => {};

  const unsupportedTx = {
    txId: 'tx3' as `tx${number}`,
    type: 'cctpV2',
    status: 'pending',
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  } as any;

  await t.throwsAsync(
    () =>
      handlePendingTx(unsupportedTx, {
        ...createMockPendingTxOpts(),
        log: mockLog,
      }),
    { message: /No monitor registered for tx type: "cctpV2"/ },
  );
});

test('handlePendingTx resolves old pending CCTP transaction successfully', async t => {
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

  const currentTime = Math.floor(Date.now() / 1000);

  mockProvider.getBlockNumber = async () => 31;
  mockProvider.getBlock = async (blockNumber: number) => ({
    timestamp: currentTime - (31 - blockNumber) * 12, // 12 seconds per block, block 31 is current
  });

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
    },
    Date.now() - 10000,
  );

  // publishTime is ~10 seconds ago, with 5 min fudge factor = 5m10s ago
  // binary search should find block ~5 (since block 31 is current time and each block is 12 seconds apart)
  const expectedFromBlock = 5;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Searching blocks ${expectedFromBlock} → 31 for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${expectedFromBlock} → 14`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('handlePendingTx resolves old pending GMP transaction successfully', async t => {
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

  const currentTime = Math.floor(Date.now() / 1000);

  mockProvider.getBlockNumber = async () => 31;
  mockProvider.getBlock = async (blockNumber: number) => ({
    timestamp: currentTime - (31 - blockNumber) * 12,
  });
  const event = createMockGmpExecutionEvent(txId);
  mockProvider.getLogs = async () => [event];

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

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
    },
    Date.now() - 10000,
  );

  // publishTime is ~10 seconds ago, with 5 min fudge factor = 5m10s ago
  // binary search should find block ~5 (since block 31 is current time and each block is 12 seconds apart)
  const expectedFromBlock = 5;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Searching blocks ${expectedFromBlock} → 31 for MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${expectedFromBlock} → 14`,
    `[${txId}] [LogScan] Match in tx=${event.transactionHash}`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test.skip('TODO: handlePendingTx resolves old pending Noble transfer successfully', async t => {});

// --- Tests for processInitialPendingTransactions ---

test('processInitialPendingTransactions handles old transactions with lookback', async t => {
  const handledCalls: Array<{ tx: any; opts: any }> = [];
  const txId: TxId = 'tx1';

  const mockHandlePendingTx = async (
    tx: any,
    opts: any,
    timeStamp: number | undefined,
  ) => {
    handledCalls.push({ tx, opts });
    if (timeStamp) {
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
  const txTimeMs = 15 * 60 * 1000; // 15 minutes ago
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
    `Processing pending tx ${txId} (age: ${txTimeMs / (1000 * 60)}min) with lookback`,
    'Processing old tx',
  ]);
});

test('processInitialPendingTransactions handles new transactions without lookback', async t => {
  const handledCalls: Array<{ tx: any; opts: any }> = [];
  const txId: TxId = 'tx2';
  const logs: string[] = [];

  const mockHandlePendingTx = async (
    tx: any,
    opts: any,
    timeStamp: number | undefined,
  ) => {
    handledCalls.push({ tx, opts });
    if (timeStamp) {
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
    `Processing pending tx ${txId} (age: ${txTimeMs / (1000 * 60)}min)`,
  ]);
});
