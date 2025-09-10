import test from 'ava';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { handlePendingTx, type EvmContext } from '../src/pending-tx-manager.ts';
import { processPendingTxEvents } from '../src/engine.ts';
import {
  createMockEvmContext,
  createMockPendingTxEvent,
  createMockStreamCell,
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
