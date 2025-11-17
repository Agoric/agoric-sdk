/** @file Quick wins: Input validation and edge cases for critical functions */
import test from 'ava';

import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/pass-style';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';

import { pickBalance, processPortfolioEvents } from '../src/engine.ts';
import {
  getCurrentBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import {
  parseStreamCell,
  parseStreamCellValue,
} from '../src/vstorage-utils.ts';
import {
  createMockEnginePowers,
  createMockProvider,
  mockGasEstimator,
} from './mocks.ts';
import { SpectrumClient } from '../src/spectrum-client.ts';
import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { scanEvmLogsInChunks, binarySearch } from '../src/support.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;
const makeDeposit = (value: bigint) => AmountMath.make(depositBrand, value);

// ============================================================================
// 1. Invalid Input Validation
// ============================================================================

test('pickBalance returns undefined for empty balances', t => {
  const usdc = {
    brand: depositBrand,
    denom: 'ibc/1234',
    issuer: Far('issuer') as any,
    displayInfo: { assetKind: 'nat' as const, decimalPlaces: 6 },
    issuerName: 'USDC',
    proposedName: 'USDC',
  };

  t.is(pickBalance(undefined, usdc), undefined);
  t.is(pickBalance([], usdc), undefined);
});

test('pickBalance returns undefined for missing denom', t => {
  const usdc = {
    brand: depositBrand,
    denom: 'ibc/1234',
    issuer: Far('issuer') as any,
    displayInfo: { assetKind: 'nat' as const, decimalPlaces: 6 },
    issuerName: 'USDC',
    proposedName: 'USDC',
  };

  const balances = [
    { amount: '50', denom: 'ibc/5678' },
    { amount: '123', denom: 'ubld' },
  ];

  t.is(pickBalance(balances, usdc), undefined);
});

test('pickBalance throws on non-numeric amount', t => {
  const usdc = {
    brand: depositBrand,
    denom: 'ibc/1234',
    issuer: Far('issuer') as any,
    displayInfo: { assetKind: 'nat' as const, decimalPlaces: 6 },
    issuerName: 'USDC',
    proposedName: 'USDC',
  };

  const balances = [{ amount: 'not-a-number', denom: 'ibc/1234' }];

  t.throws(() => pickBalance(balances, usdc), {
    message: /Cannot convert/,
  });
});

test('parseStreamCell throws on malformed JSON', t => {
  t.throws(() => parseStreamCell('not-valid-json', 'test.path'), {
    message: /Unexpected token/,
  });
});

test('parseStreamCell throws on missing blockHeight', t => {
  const invalidCell = JSON.stringify({ values: ['test'] });
  t.throws(() => parseStreamCell(invalidCell, 'test.path'), {
    message: /Must have missing properties.*blockHeight/,
  });
});

test('parseStreamCell throws on missing values array', t => {
  const invalidCell = JSON.stringify({ blockHeight: '100' });
  t.throws(() => parseStreamCell(invalidCell, 'test.path'), {
    message: /Must have missing properties.*values/,
  });
});

test('parseStreamCellValue throws on out-of-bounds index', t => {
  const cell = { blockHeight: '100', values: ['val1', 'val2'] };
  // Out of bounds results in undefined, which causes JSON parse error
  t.throws(() => parseStreamCellValue(cell, 5, 'test.path'), {
    message: /Input must be a string/,
  });
  t.throws(() => parseStreamCellValue(cell, -5, 'test.path'), {
    message: /Input must be a string/,
  });
});

test('parseStreamCellValue throws on non-JSON value', t => {
  const cell = { blockHeight: '100', values: ['not-valid-json'] };
  t.throws(() => parseStreamCellValue(cell, 0, 'test.path'), {
    message: /Unexpected token/,
  });
});

test('getCurrentBalances handles empty positionKeys', async t => {
  const status = {
    positionKeys: [],
    accountIdByChain: {},
  } as any;

  const powers = {
    cosmosRest: {} as any,
    spectrum: {} as any,
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
  };

  const balances = await getCurrentBalances(status, depositBrand, powers);
  t.deepEqual(balances, {});
});

test('getCurrentBalances throws on invalid CAIP-10 address', async t => {
  const status = {
    positionKeys: [],
    accountIdByChain: {
      Arbitrum: 'not-a-valid-caip10-address',
    },
  } as any;

  const powers = {
    cosmosRest: {} as any,
    spectrum: {} as any,
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
  };

  const error = await t.throwsAsync(
    async () => getCurrentBalances(status, depositBrand, powers),
    { instanceOf: AggregateError },
  );

  // Check that one of the errors mentions invalid address
  t.true(
    (error as AggregateError).errors.some(e =>
      e.message.includes('Invalid CAIP-10'),
    ),
  );
});

test('planDepositToAllocations returns empty on missing targetAllocation', async t => {
  const steps = await planDepositToAllocations({
    amount: makeDeposit(1000n),
    brand: depositBrand,
    currentBalances: {},
    targetAllocation: undefined,
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  t.deepEqual(steps, []);
});

test('planRebalanceToAllocations returns empty on missing targetAllocation', async t => {
  const steps = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances: { USDN: makeDeposit(1000n) },
    targetAllocation: undefined,
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  t.deepEqual(steps, []);
});

test('planRebalanceToAllocations returns empty on empty targetAllocation', async t => {
  const steps = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances: { USDN: makeDeposit(1000n) },
    targetAllocation: {},
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  t.deepEqual(steps, []);
});

// ============================================================================
// 2. Timeout Scenarios
// ============================================================================

test('scanEvmLogsInChunks respects abort signal', async t => {
  const provider = createMockProvider(1000);
  const abortController = new AbortController();
  const logs: any[] = [];

  // Abort immediately
  abortController.abort();

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 100,
      chainId: 'eip155:1',
      chunkSize: 10,
      signal: abortController.signal,
    },
    async log => {
      logs.push(log);
      return false;
    },
  );

  t.is(result, undefined);
  t.is(logs.length, 0);
});

test('scanEvmLogsInChunks stops on first match', async t => {
  const mockEvents = [
    {
      blockNumber: 5,
      data: '0x01',
      topics: ['0xtopic1'],
      transactionHash: '0xhash1',
    },
    {
      blockNumber: 15,
      data: '0x02',
      topics: ['0xtopic2'],
      transactionHash: '0xhash2',
    },
    {
      blockNumber: 25,
      data: '0x03',
      topics: ['0xtopic3'],
      transactionHash: '0xhash3',
    },
  ];

  const provider = createMockProvider(1000, mockEvents);
  let matchCount = 0;

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 100,
      chainId: 'eip155:1',
      chunkSize: 10,
    },
    async log => {
      matchCount++;
      // Match the second event
      return log.blockNumber === 15;
    },
  );

  t.truthy(result);
  t.is(result?.blockNumber, 15);
  // Should have checked first two events, not the third
  t.is(matchCount, 2);
});

test('scanEvmLogsInChunks handles empty result set', async t => {
  const provider = createMockProvider(1000, []);

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 100,
      chainId: 'eip155:1',
    },
    async () => true,
  );

  t.is(result, undefined);
});

// ============================================================================
// 3. Empty/Null/Undefined Optional Parameters
// ============================================================================

test('processPortfolioEvents handles empty events array', async t => {
  const memory = { deferrals: [] };
  const powers = {
    ...createMockEnginePowers(),
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix: 'published.test.portfolios' },
    isDryRun: true,
    signingSmartWalletKit: {
      marshaller: boardSlottingMarshaller(),
      query: {
        vstorage: {
          readStorageMeta: async () => ({
            blockHeight: 100n,
            result: { children: [] },
          }),
        },
      },
    } as any,
    walletStore: { get: () => ({}) } as any,
    gasEstimator: mockGasEstimator,
  };

  await t.notThrowsAsync(async () => {
    await processPortfolioEvents([], 100n, memory, powers);
  });

  t.is(memory.deferrals.length, 0);
});

test('planWithdrawFromAllocations handles empty currentBalances', async t => {
  const steps = await planWithdrawFromAllocations({
    amount: makeDeposit(100n),
    brand: depositBrand,
    currentBalances: {},
    targetAllocation: { USDN: 1n },
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  // Should produce steps even with empty current balances
  t.true(Array.isArray(steps));
});

test('getCurrentBalances handles undefined balance query responses', async t => {
  class MockSpectrumClient extends SpectrumClient {
    constructor() {
      super({ fetch, setTimeout });
    }

    async getPoolBalance() {
      return {
        pool: 'aave',
        chain: 'arbitrum',
        address: '0x123',
        balance: { supplyBalance: 0, borrowAmount: 0 },
      };
    }
  }

  const status = {
    positionKeys: ['Aave_Arbitrum'],
    accountIdByChain: {
      Arbitrum: 'eip155:42161:0x123',
    },
  } as any;

  const powers = {
    cosmosRest: {} as any,
    spectrum: new MockSpectrumClient(),
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
  };

  const balances = await getCurrentBalances(status, depositBrand, powers);
  // Zero balance should still be included
  t.deepEqual(balances, {
    Aave_Arbitrum: makeDeposit(0n),
    '@Arbitrum': undefined,
  });
});

// ============================================================================
// 4. Boundary Values (0, MAX_SAFE_INTEGER)
// ============================================================================

test('planDepositToAllocations handles zero amount', async t => {
  const steps = await planDepositToAllocations({
    amount: makeDeposit(0n),
    brand: depositBrand,
    currentBalances: {},
    targetAllocation: { USDN: 1n },
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  // Zero deposit should return empty steps
  t.deepEqual(steps, []);
});

test('planDepositToAllocations handles very large amounts', async t => {
  const hugeAmount = makeDeposit(BigInt(Number.MAX_SAFE_INTEGER) * 1000n);

  await t.notThrowsAsync(async () => {
    await planDepositToAllocations({
      amount: hugeAmount,
      brand: depositBrand,
      currentBalances: {},
      targetAllocation: { USDN: 1n },
      network: {} as any,
      feeBrand,
      gasEstimator: mockGasEstimator,
    });
  });
});

test('planWithdrawFromAllocations handles withdrawal larger than balance', async t => {
  const currentBalances = {
    USDN: makeDeposit(100n),
  };

  await t.throwsAsync(
    async () =>
      planWithdrawFromAllocations({
        amount: makeDeposit(1000n), // 10x current balance
        brand: depositBrand,
        currentBalances,
        targetAllocation: { USDN: 1n },
        network: {} as any,
        feeBrand,
        gasEstimator: mockGasEstimator,
      }),
    { message: /total after delta must not be negative/ },
  );
});

test('planRebalanceToAllocations handles zero-weight allocations', async t => {
  const steps = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances: { USDN: makeDeposit(1000n) },
    targetAllocation: {
      USDN: 0n,
      Aave_Arbitrum: 1n,
    },
    network: {} as any,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });

  // Should produce rebalance from USDN to Aave_Arbitrum
  t.true(steps.length > 0);
});

test('planRebalanceToAllocations throws on all-zero weights', async t => {
  await t.throwsAsync(
    async () =>
      planRebalanceToAllocations({
        brand: depositBrand,
        currentBalances: { USDN: makeDeposit(1000n) },
        targetAllocation: {
          USDN: 0n,
          Aave_Arbitrum: 0n,
        },
        network: {} as any,
        feeBrand,
        gasEstimator: mockGasEstimator,
      }),
    { message: /allocation weights must sum > 0/ },
  );
});

test('binarySearch handles single-element range', async t => {
  const result = await binarySearch(5, 5, async n => n === 5);
  t.is(result, 5);
});

test('binarySearch handles range where nothing is acceptable', async t => {
  const result = await binarySearch(0, 100, async () => false);
  t.is(result, 0);
});

test('binarySearch handles range where everything is acceptable', async t => {
  const result = await binarySearch(0, 100, async () => true);
  t.is(result, 100);
});

test('binarySearch with bigint handles large ranges', async t => {
  const start = 0n;
  const end = BigInt(Number.MAX_SAFE_INTEGER) * 2n;
  const target = BigInt(Number.MAX_SAFE_INTEGER);

  const result = await binarySearch(start, end, async n => n <= target);
  t.is(result, target);
});

// ============================================================================
// 5. Malformed Blockchain Data
// ============================================================================

test('parseStreamCell handles empty values array', t => {
  const cell = JSON.stringify({ blockHeight: '100', values: [] });
  const parsed = parseStreamCell(cell, 'test.path');
  t.deepEqual(parsed, { blockHeight: '100', values: [] });
});

test('parseStreamCell handles non-string blockHeight', t => {
  const cell = JSON.stringify({ blockHeight: 100, values: [] });
  t.throws(() => parseStreamCell(cell, 'test.path'), {
    message: /Must be a string/,
  });
});

test('parseStreamCellValue handles nested invalid JSON', t => {
  const cell = {
    blockHeight: '100',
    values: [JSON.stringify({ invalid: 'not-marshalled-capdata' })],
  };
  // Should not throw on parse, but might fail on unmarshalling
  t.notThrows(() => parseStreamCellValue(cell, 0, 'test.path'));
});

test('scanEvmLogsInChunks handles getLogs errors gracefully', async t => {
  const provider = createMockProvider(1000);
  // Override getLogs to throw
  (provider as any).getLogs = async () => {
    throw new Error('RPC node unavailable');
  };

  const logs: any[] = [];
  const logMessages: string[] = [];

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 100,
      chainId: 'eip155:1',
      chunkSize: 50,
      log: (...args: any[]) => logMessages.push(args.join(' ')),
    },
    async log => {
      logs.push(log);
      return true;
    },
  );

  t.is(result, undefined);
  t.is(logs.length, 0);
  t.true(logMessages.some(msg => msg.includes('Error searching chunk')));
});

test('getCurrentBalances aggregates errors from multiple position queries', async t => {
  class FailingSpectrumClient extends SpectrumClient {
    constructor() {
      super({ fetch, setTimeout });
    }

    async getPoolBalance() {
      throw new Error('Spectrum API timeout');
    }
  }

  const status = {
    positionKeys: ['Aave_Arbitrum', 'Compound_Base'],
    accountIdByChain: {
      Arbitrum: 'eip155:42161:0x123',
      Base: 'eip155:8453:0x456',
    },
  } as any;

  const powers = {
    cosmosRest: {} as any,
    spectrum: new FailingSpectrumClient(),
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
  };

  const error = await t.throwsAsync(
    async () => getCurrentBalances(status, depositBrand, powers),
    { instanceOf: AggregateError },
  );

  // Should collect multiple errors
  t.true((error as AggregateError).errors.length >= 2);
});

// ============================================================================
// 6. Edge Cases in Portfolio Processing
// ============================================================================

test('processPortfolioEvents handles portfolio with no flows', async t => {
  const marshaller = boardSlottingMarshaller();
  const portfolioStatus = {
    positionKeys: [],
    flowCount: 0,
    accountIdByChain: {},
    policyVersion: 1,
    rebalanceCount: 0,
    targetAllocation: {},
    flowsRunning: {}, // No flows
  };

  const memory = { deferrals: [] };
  const kvStore = makeKVStoreFromMap(new Map());
  const plannerCalls: any[] = [];

  const powers = {
    ...createMockEnginePowers(),
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix: 'published.test.portfolios' },
    isDryRun: true,
    signingSmartWalletKit: {
      marshaller,
      query: {
        vstorage: {
          readStorageMeta: async (path: string) => {
            if (path.includes('.flows')) {
              return {
                blockHeight: 100n,
                result: { children: [] },
              };
            }
            return {
              blockHeight: 100n,
              result: {
                value: JSON.stringify({
                  blockHeight: '100',
                  values: [
                    JSON.stringify(marshaller.toCapData(portfolioStatus)),
                  ],
                }),
              },
            };
          },
          readStorage: async () => {
            return {
              value: JSON.stringify({
                blockHeight: '100',
                values: [JSON.stringify(marshaller.toCapData(portfolioStatus))],
              }),
            };
          },
        },
      },
    } as any,
    walletStore: {
      get: () => ({
        resolvePlan: async (...args: any[]) => {
          plannerCalls.push(args);
          return { tx: 'mock-tx', id: 'mock-id' };
        },
      }),
    } as any,
    gasEstimator: mockGasEstimator,
    kvStore,
  };

  const event = {
    path: 'published.test.portfolios.portfolio1',
    value: JSON.stringify({
      blockHeight: '100',
      values: [JSON.stringify(marshaller.toCapData(portfolioStatus))],
    }),
    eventRecord: {
      blockHeight: 100n,
      type: 'kvstore' as const,
      event: { type: 'state_change', attributes: [] },
    },
  };

  await processPortfolioEvents([event], 100n, memory, powers);

  // Should not call planner when no flows are running
  t.is(plannerCalls.length, 0);
  t.is(memory.deferrals.length, 0);
});

test('processPortfolioEvents defers on stale response', async t => {
  const marshaller = boardSlottingMarshaller();
  const memory = { deferrals: [] };

  const powers = {
    ...createMockEnginePowers(),
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix: 'published.test.portfolios' },
    isDryRun: true,
    signingSmartWalletKit: {
      marshaller,
      query: {
        vstorage: {
          readStorageMeta: async () => {
            // Return data from older block than requested
            return {
              blockHeight: 50n, // Older than event blockHeight
              result: { children: [] },
            };
          },
        },
      },
    } as any,
    walletStore: { get: () => ({}) } as any,
    gasEstimator: mockGasEstimator,
  };

  const event = {
    path: 'published.test.portfolios.portfolio1',
    value: JSON.stringify({
      blockHeight: '100',
      values: ['test'],
    }),
    eventRecord: {
      blockHeight: 100n,
      type: 'kvstore' as const,
      event: { type: 'state_change', attributes: [] },
    },
  };

  await processPortfolioEvents([event], 100n, memory, powers);

  // Should defer the event due to stale response
  t.is(memory.deferrals.length, 1);
  t.is(memory.deferrals[0]?.blockHeight, 100n);
});
