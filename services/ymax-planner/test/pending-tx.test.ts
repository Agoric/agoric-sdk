import test from 'ava';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import {
  handlePendingTx,
  type EvmContext,
  type PendingTx,
} from '../src/pending-tx-manager.ts';
import { processPendingTxEvents, parsePendingTx } from '../src/engine.ts';
import {
  createMockEvmContext,
  createMockPendingTxData,
  createMockPendingTxEvent,
  createMockStreamCell,
} from './mocks.ts';

const marshaller = boardSlottingMarshaller();

// --- Unit tests for parsePendingTx ---
test('parsePendingTx creates valid PendingTx from data', t => {
  const txId = 'tx1' as `tx${number}`;
  const txData = createMockPendingTxData({ type: 'cctp' });
  const capData = marshaller.toCapData(txData);

  const result = parsePendingTx(txId, capData, marshaller);

  t.truthy(result);
  t.is(result?.txId, txId);
  t.is(result?.type, 'cctp');
  t.is(result?.status, 'pending');
  t.is(result?.amount, 1000_00n);
  t.is(
    result?.destinationAddress,
    'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  );
});

test('parsePendingTx returns null for invalid data shape', t => {
  const txId = 'tx3' as `tx${number}`;
  const invalidTxData = harden({
    someOtherField: 'value',
  });

  const result = parsePendingTx(txId, invalidTxData);

  t.is(result, null);
});

// --- Unit tests for processPendingTxEvents ---
test('processPendingTxEvents handles valid single transaction event', async t => {
  const mockEvmCtx = createMockEvmContext();
  const handledTxs: PendingTx[] = [];

  // Mock handlePendingTx to track calls
  const mockHandlePendingTx = async (
    ctx: EvmContext,
    tx: PendingTx,
    log: any,
  ) => {
    handledTxs.push(tx);
  };

  const txData = createMockPendingTxData({ type: 'cctp' });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await processPendingTxEvents(
    mockEvmCtx,
    events,
    marshaller,
    mockHandlePendingTx,
  );

  t.is(handledTxs.length, 1);
  t.is(handledTxs[0].txId, 'tx1');
  t.is(handledTxs[0].type, 'cctp');
  t.is(handledTxs[0].status, 'pending');
});

test('processPendingTxEvents handles multiple transaction events', async t => {
  const mockEvmCtx = createMockEvmContext();
  const handledTxs: PendingTx[] = [];

  const mockHandlePendingTx = async (
    ctx: EvmContext,
    tx: PendingTx,
    log: any,
  ) => {
    handledTxs.push(tx);
  };

  const originalCctpData = createMockPendingTxData({ type: 'cctp' });
  const originalGmpData = createMockPendingTxData({ type: 'gmp' });

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
    mockEvmCtx,
    events,
    marshaller,
    mockHandlePendingTx,
  );

  t.is(handledTxs.length, 2);
  t.is(handledTxs[0].txId, 'tx1');
  t.is(handledTxs[0].type, 'cctp');
  t.is(handledTxs[1].txId, 'tx2');
  t.is(handledTxs[1].type, 'gmp');
});

test('processPendingTxEvents processes valid transactions before throwing on invalid stream cell', async t => {
  const mockEvmCtx = createMockEvmContext();
  const handledTxs: PendingTx[] = [];

  const mockHandlePendingTx = async (
    ctx: EvmContext,
    tx: PendingTx,
    log: any,
  ) => {
    handledTxs.push(tx);
  };

  const validTx1 = createMockPendingTxData({ type: 'cctp' });
  const validTx2 = createMockPendingTxData({ type: 'gmp' });
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
  ];

  await t.throwsAsync(
    () =>
      processPendingTxEvents(
        mockEvmCtx,
        events,
        marshaller,
        mockHandlePendingTx,
      ),
    { message: /Must have missing properties.*blockHeight/ },
  );

  t.is(
    handledTxs.length,
    1,
    'No transactions should be handled due to invalid tx causing early return',
  );
});

test('processPendingTxEvents handles only pending transactions', async t => {
  const mockEvmCtx = createMockEvmContext();
  const handledTxs: PendingTx[] = [];

  const mockHandlePendingTx = async (
    ctx: EvmContext,
    tx: PendingTx,
    log: any,
  ) => {
    handledTxs.push(tx);
  };

  const tx1 = createMockPendingTxData({ type: 'cctp' });
  const tx2 = createMockPendingTxData({ type: 'gmp', status: 'success' });

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
    mockEvmCtx,
    events,
    marshaller,
    mockHandlePendingTx,
  );

  t.is(handledTxs.length, 1);
  t.is(handledTxs[0].status, 'pending');
});

// --- Unit tests for handlePendingTx ---
test('handlePendingTx throws error for unsupported transaction type', async t => {
  const mockEvmCtx = createMockEvmContext();
  const mockLog = () => {};

  const unsupportedTx = {
    txId: 'tx3' as `tx${number}`,
    type: 'unsupported',
    status: 'pending',
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  } as any;

  await t.throwsAsync(
    () => handlePendingTx(mockEvmCtx, unsupportedTx, { log: mockLog }),
    { message: /No monitor registered for tx type: unsupported/ },
  );
});
