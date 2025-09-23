import test from 'ava';
import { watchNobleTransfer } from '../src/watchers/noble-watcher.ts';
import { createMockCosmosRestClient } from './mocks.ts';

test('watchNobleTransfer detects successful transfer', async t => {
  const mockCosmosRest = createMockCosmosRestClient({
    balanceResponses: [
      { amount: '1000000', denom: 'uusdc' }, // Initial balance: 1 USDC
      { amount: '1500000', denom: 'uusdc' }, // After transfer: 1.5 USDC
    ],
  });

  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  const result = await watchNobleTransfer({
    cosmosRest: mockCosmosRest as any,
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
  const mockCosmosRest = createMockCosmosRestClient({
    balanceResponses: [
      { amount: '1000000', denom: 'uusdc' }, // Balance stays the same
    ],
  });

  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  const result = await watchNobleTransfer({
    cosmosRest: mockCosmosRest as any,
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
