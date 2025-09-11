import test from 'ava';
import { watchNobleTransfer } from '../src/watchers/noble-watcher.ts';
import { createMockCosmosRestClient, createMockEvmContext } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';

const marshaller = boardSlottingMarshaller();
const mockEvmCtx = createMockEvmContext();
const powers = {
  ...mockEvmCtx,
  marshaller,
  log: () => {},
  error: () => {},
  timeoutMs: 1000,
};

test('watchNobleTransfer detects successful transfer', async t => {
  const mockCosmosRest = createMockCosmosRestClient([
    { amount: '1000000', denom: 'uusdc' }, // Initial balance: 1 USDC
    { amount: '1500000', denom: 'uusdc' }, // After transfer: 1.5 USDC
  ]);

  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  const result = await watchNobleTransfer({
    cosmosRest: mockCosmosRest,
    watchAddress: 'noble1abc123456789',
    expectedAmount: 500000n, // 0.5 USDC
    expectedDenom: 'uusdc',
    timeoutMs: 3000,
    pollIntervalMs: 1000,
    log: mockLog,
  });

  t.is(result, true);
  t.true(logs.some(log => log.includes('Initial balance: 1000000')));
  t.true(logs.some(log => log.includes('Expected amount received!')));
});

test('watchNobleTransfer times out when no transfer detected', async t => {
  const mockCosmosRest = createMockCosmosRestClient([
    { amount: '1000000', denom: 'uusdc' }, // Balance stays the same
  ]);

  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  const result = await watchNobleTransfer({
    cosmosRest: mockCosmosRest,
    watchAddress: 'noble1abc123456789',
    expectedAmount: 500000n, // 0.5 USDC
    expectedDenom: 'uusdc',
    timeoutMs: 3000,
    pollIntervalMs: 1000,
    log: mockLog,
  });

  t.is(result, false);
  t.true(logs.some(log => log.includes('No matching Noble transfer found')));
});

// --- Noble chain validation tests ---
test('nobleWithdrawMonitor - valid noble-1 mainnet chain passes validation', async t => {
  const txData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 1000000n,
    destinationAddress:
      'cosmos:noble-1:noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y',
  });

  const errorMessages: string[] = [];
  await handlePendingTx({ txId: 'tx1', ...txData } as PendingTx, powers);

  t.false(errorMessages.some(msg => msg.includes('Expected cosmos chain')));
  t.false(errorMessages.some(msg => msg.includes('Expected noble chain')));
});

test('nobleWithdrawMonitor - valid grand-1 testnet chain passes validation', async t => {
  const txData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 1000000n,
    destinationAddress:
      'cosmos:grand-1:noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y',
  });

  const errorMessages: string[] = [];
  await handlePendingTx({ txId: 'tx1', ...txData } as PendingTx, powers);

  t.false(errorMessages.some(msg => msg.includes('Expected cosmos chain')));
  t.false(errorMessages.some(msg => msg.includes('Expected noble chain')));
});

test('nobleWithdrawMonitor - invalid testnet chain fails validation', async t => {
  const txData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 1000000n,
    destinationAddress:
      'cosmos:grand-27:noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y',
  });

  await t.throwsAsync(
    () => handlePendingTx({ txId: 'tx1', ...txData } as PendingTx, powers),
    {
      message: '"[[tx1]]" Expected noble chain, got: "grand-27"',
    },
  );
});
