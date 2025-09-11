import test from 'ava';
import { boardSlottingMarshaller } from '@agoric/client-utils';

import { processPendingTxEvents } from '../src/engine.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import {
  createMockEvmContext,
  createMockPendingTxEvent,
  createMockStreamCell,
} from './mocks.ts';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';

const marshaller = boardSlottingMarshaller();
const mockEvmCtx = createMockEvmContext();
const powers = {
  ...mockEvmCtx,
  marshaller,
  log: () => {},
  error: () => {},
};
const mockHandlePendingTxFn = async () => {};

test('processPendingTxEvents - valid CCTP_TO_EVM shape passes mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );
});

test('processPendingTxEvents - valid CCTP_TO_NOBLE shape passes mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_NOBLE });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );
});

test('processPendingTxEvents - valid GMP shape with amount passes mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.GMP, amount: 20000n });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );
});

test('processPendingTxEvents - valid GMP shape without amount passes mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.GMP });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );
});

test('processPendingTxEvents - missing required amount field for CCTP_TO_EVM fails mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  const errorMessages: string[] = [];
  powers.error = (...args: any[]) => errorMessages.push(args.join(' '));

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );

  t.true(errorMessages.length > 0);
  t.true(
    errorMessages.some(msg => msg.includes('Failed to process pending tx')),
  );
});

test('processPendingTxEvents - missing required amount field for CCTP_TO_NOBLE fails mustMatch', async t => {
  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_NOBLE });
  const capData = marshaller.toCapData(txData);
  const streamCell = createMockStreamCell([JSON.stringify(capData)]);
  const events = [createMockPendingTxEvent('tx1', JSON.stringify(streamCell))];

  const errorMessages: string[] = [];
  powers.error = (...args: any[]) => errorMessages.push(args.join(' '));

  await t.notThrowsAsync(
    processPendingTxEvents(events, mockHandlePendingTxFn, powers),
  );

  t.true(errorMessages.length > 0);
  t.true(
    errorMessages.some(msg => msg.includes('Failed to process pending tx')),
  );
});
