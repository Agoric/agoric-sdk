import test from 'ava';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { processPendingTxEvents } from '../src/engine.ts';
import {
  createMockEvmContext,
  createMockPendingTxEvent,
  createMockStreamCell,
  createMockTransferLog,
  createMockGmpExecutionLog,
} from './mocks.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
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
  const mockEvmCtx = createMockEvmContext();

  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await processPendingTxEvents(events, mockHandlePendingTx, {
    ...mockEvmCtx,
    marshaller,
  });

  t.is(handledTxs.length, 1);
  t.like(handledTxs[0], {
    txId: 'tx1',
    type: TxType.CCTP_TO_EVM,
    status: 'pending',
  });
});

test('processPendingTxEvents handles multiple transaction events', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();
  const mockEvmCtx = createMockEvmContext();

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

  await processPendingTxEvents(events, mockHandlePendingTx, {
    ...mockEvmCtx,
    marshaller,
  });

  t.is(handledTxs.length, 2);
  t.like(handledTxs[0], { txId: 'tx1', type: TxType.CCTP_TO_EVM });
  t.like(handledTxs[1], { txId: 'tx2', type: TxType.GMP });
});

test('processPendingTxEvents errors do not disrupt processing valid transactions', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();
  const mockEvmCtx = createMockEvmContext();

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
    ...mockEvmCtx,
    marshaller,
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
  const mockEvmCtx = createMockEvmContext();

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

  await processPendingTxEvents(events, mockHandlePendingTx, {
    ...mockEvmCtx,
    marshaller,
  });

  t.is(handledTxs.length, 1);
  t.is(handledTxs[0].status, 'pending');
});

test('processPendingTxEvents handles Noble withdraw transactions', async t => {
  const { mockHandlePendingTx, handledTxs } = makeMockHandlePendingTx();
  const mockEvmCtx = createMockEvmContext();

  const nobleWithdrawData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 1_000_000n,
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });

  const capData = marshaller.toCapData(nobleWithdrawData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await processPendingTxEvents(events, mockHandlePendingTx, {
    ...mockEvmCtx,
    marshaller,
  });

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
  const mockEvmCtx = createMockEvmContext();
  const mockLog = () => {};

  const unsupportedTx = {
    txId: 'tx3' as `tx${number}`,
    type: 'cctpV2',
    status: 'pending',
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  } as any;

  await t.throwsAsync(
    () => handlePendingTx(unsupportedTx, { ...mockEvmCtx, log: mockLog }),
    { message: /No monitor registered for tx type: "cctpV2"/ },
  );
});

test('handlePendingTx resolves historical CCTP transaction successfully', async t => {
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

  const mockEvmCtx = createMockEvmContext();
  const mockProvider = mockEvmCtx.evmProviders[chainId] as any;

  const currentTime = Math.floor(Date.now() / 1000);

  mockProvider.getBlockNumber = async () => 31;
  mockProvider.getBlock = async (blockNumber: number) => ({
    timestamp: currentTime - (31 - blockNumber) * 12, // 12 seconds per block, block 31 is current
  });

  const log = createMockTransferLog(
    mockEvmCtx.usdcAddresses[chainId],
    txAmount,
    recipientAddress,
  );
  mockProvider.getLogs = async () => [log];

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...mockEvmCtx,
      log: mockLog,
      mode: 'history',
      publishTimeMs: Date.now() - 10000,
    },
  );

  // publishTime is ~10 seconds ago, so binary search should find block ~30
  // (since block 31 is current time and each block is 12 seconds apart)
  const expectedFromBlock = 30;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Searching blocks ${expectedFromBlock} → 31`,
    `[${txId}] Looking for Transfer to ${recipientAddress} amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${expectedFromBlock} → 31`,
    `[${txId}] Check: amount=${txAmount}`,
    `[${txId}] [LogScan] Match in tx=${log.transactionHash}`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('handlePendingTx resolves historical GMP transaction successfully', async t => {
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
  const mockEvmCtx = createMockEvmContext();
  const mockProvider = mockEvmCtx.evmProviders[chainId] as any;

  const currentTime = Math.floor(Date.now() / 1000);

  mockProvider.getBlockNumber = async () => 31;
  mockProvider.getBlock = async (blockNumber: number) => ({
    timestamp: currentTime - (31 - blockNumber) * 12,
  });
  const log = createMockGmpExecutionLog(txId);
  mockProvider.getLogs = async () => [log];

  // Mock fetch for Axelar API call
  mockEvmCtx.fetch = async (url: string) => {
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
                logs: [createMockGmpExecutionLog(txId)],
              },
            },
          },
        ],
      }),
    } as Response;
  };

  await handlePendingTx(
    { txId, ...gmpTx },
    {
      ...mockEvmCtx,
      log: mockLog,
      mode: 'history',
      publishTimeMs: Date.now() - 10000,
    },
  );

  // publishTime is ~10 seconds ago, so binary search should find block ~30
  const expectedFromBlock = 30;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Searching blocks ${expectedFromBlock} → 31`,
    `[${txId}] Looking for MulticallExecuted for txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${expectedFromBlock} → 31`,
    `[${txId}] [LogScan] Match in tx=${log.transactionHash}`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test.skip('TODO: handlePendingTx resolves historical Noble transfer successfully', async t => {});
