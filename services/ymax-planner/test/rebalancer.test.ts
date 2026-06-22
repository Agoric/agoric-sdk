import test from 'ava';

import { Far } from '@endo/pass-style';
import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp';
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import { CaipChainIds } from '@agoric/portfolio-api/src/constants.js';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';

import type { YdsGasStateResponse } from '../src/gas-prices.ts';
import {
  filterPlan,
  makeFilterStepByGasState,
  parseChainsGasResponse,
} from '../src/gas-prices.ts';
import { rebalancePortfolios } from '../src/rebalancer.ts';
import {
  createMockEnginePowers,
  makeNotImplemented,
  mockEvmCtx,
  mockGasEstimator,
} from './mocks.ts';

const brand = Far('USDC brand') as unknown as Brand<'nat'>;
const feeBrand = Far('Fee brand') as unknown as Brand<'nat'>;
const makeAmount = (value: bigint) => AmountMath.make(brand, value);
const makeGasState = (
  prices: Record<
    string,
    {
      current: number;
      p30dP50: number;
      currentUusd?: number;
      p30dP50Uusd?: number;
      noP30D?: boolean;
    }
  >,
): YdsGasStateResponse => ({
  message: 'Gas data retrieved successfully',
  timestamp: '2026-06-12T00:00:00.000Z',
  data: Object.entries(prices).map(([chainName, price], index) => {
    const currentUusd = price.currentUusd ?? price.current * 2;
    const p30dP50Uusd = price.p30dP50Uusd ?? price.p30dP50 * 2;
    return {
      caip2Id: `eip155:${index + 1}`,
      chainName,
      gasDenom: 'ETH',
      gasDenomScale: 9,
      current: {
        sampleBaseFee: price.current,
        samplePriorityFee: 0,
        sample: price.current,
        sampleUusd: currentUusd,
        usdPerGasDenom: 2,
        blockNumber: 12_345,
        blockTimestampSec: 1_797_000_000,
        takenAtSec: 1_797_000_000,
      },
      windows: price.noP30D
        ? []
        : [
            {
              duration: 'P30D',
              untilSec: 1_797_000_000,
              min: price.p30dP50,
              mean: price.p30dP50,
              p50: price.p30dP50,
              p90: price.p30dP50,
              max: price.p30dP50,
              minUusd: p30dP50Uusd,
              meanUusd: p30dP50Uusd,
              p50Uusd: p30dP50Uusd,
              p90Uusd: p30dP50Uusd,
              maxUusd: p30dP50Uusd,
              sampleCount: 1,
            },
          ],
    };
  }),
});

test('parseChainsGasResponse accepts only the current /chains/gas schema', t => {
  const gasState = makeGasState({
    Ethereum: { current: 100, p30dP50: 100 },
  });

  t.deepEqual(parseChainsGasResponse(gasState), gasState);
  t.throws(
    () =>
      parseChainsGasResponse({
        ...gasState,
        data: [
          {
            ...gasState.data[0],
            current: {
              latestScaledGasDenomPerGasUnit: 100,
              takenAtSec: 1_797_000_000,
            },
            windows: [
              {
                window: 'P30D',
                until: '2026-06-12T00:00:00.000Z',
                mean: 100,
                p50: 100,
                p90: 100,
                sampleCount: 1,
              },
            ],
            recent: [],
          },
        ],
      }),
    { message: 'unexpected /chains/gas response schema' },
  );
});

test('filterGasFavorablePlan removes expensive steps and dependents', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@agoric',
        dest: '@Ethereum',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
      {
        src: '@Ethereum',
        dest: 'Aave_Arbitrum',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
    ],
    order: [
      [1, [0]],
      [2, [1]],
    ],
  };

  const gasState = makeGasState({
    Ethereum: { current: 151, p30dP50: 100 },
    Arbitrum: { current: 100, p30dP50: 100 },
    Base: { current: 100, p30dP50: 100 },
  });
  const filterStep = makeFilterStepByGasState(gasState);
  const filtered = filterPlan(plan, filterStep);

  t.deepEqual(filtered, { flow: [], order: [] });
});

test('filterGasFavorablePlan compacts retained order indexes', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@agoric',
        dest: '@Ethereum',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
      {
        src: '@Base',
        dest: '@Optimism',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      } as any,
    ],
    order: [[2, [1]]],
  };

  const gasState = makeGasState({
    Ethereum: { current: 151, p30dP50: 100 },
    Base: { current: 100, p30dP50: 100 },
    Optimism: { current: 100, p30dP50: 100 },
  });
  const filterStep = makeFilterStepByGasState(gasState);
  const filtered = filterPlan(plan, filterStep);

  t.deepEqual(filtered, {
    flow: [
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      },
      {
        src: '@Base',
        dest: '@Optimism',
        amount: makeAmount(1_000n),
        gasEstimate: 1n,
      },
    ],
    order: [[1, [0]]],
  });
});

test('filterGasFavorablePlan removes steps at gas favorability boundary', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@agoric',
        dest: '@Ethereum',
        amount: makeAmount(1_000n),
      } as any,
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
      } as any,
    ],
    order: [],
  };

  const gasState = makeGasState({
    Ethereum: { current: 150, p30dP50: 100 },
    Base: { current: 149, p30dP50: 100 },
  });
  const filterStep = makeFilterStepByGasState(gasState);
  const filtered = filterPlan(plan, filterStep);

  t.deepEqual(filtered, {
    flow: [
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
      },
    ],
    order: [],
  });
});

test('filterGasFavorablePlan uses USD gas fields', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@agoric',
        dest: '@Ethereum',
        amount: makeAmount(1_000n),
      } as any,
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
      } as any,
    ],
    order: [],
  };

  const gasState = makeGasState({
    Ethereum: {
      current: 100,
      p30dP50: 100,
      currentUusd: 151,
      p30dP50Uusd: 100,
    },
    Base: {
      current: 151,
      p30dP50: 100,
      currentUusd: 100,
      p30dP50Uusd: 100,
    },
  });
  const filterStep = makeFilterStepByGasState(gasState);
  const filtered = filterPlan(plan, filterStep);

  t.deepEqual(filtered, {
    flow: [
      {
        src: '@agoric',
        dest: '@Base',
        amount: makeAmount(1_000n),
      },
    ],
    order: [],
  });
});

test('filterGasFavorablePlan removes steps without P30D gas window', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@agoric',
        dest: '@Ethereum',
        amount: makeAmount(1_000n),
      } as any,
    ],
    order: [],
  };

  const gasState = makeGasState({
    Ethereum: { current: 100, p30dP50: 100, noP30D: true },
  });
  const filterStep = makeFilterStepByGasState(gasState);
  const filtered = filterPlan(plan, filterStep);

  t.deepEqual(filtered, { flow: [], order: [] });
});

test('rebalancePortfolios logs per-portfolio errors and continues', async t => {
  const consoleWrites: Array<{ level: string; args: unknown[] }> = [];
  const mockConsole = {
    debug: (...args: unknown[]) => consoleWrites.push({ level: 'debug', args }),
    info: (...args: unknown[]) => consoleWrites.push({ level: 'info', args }),
    log: (...args: unknown[]) => consoleWrites.push({ level: 'log', args }),
    warn: (...args: unknown[]) => consoleWrites.push({ level: 'warn', args }),
    error: (...args: unknown[]) => consoleWrites.push({ level: 'error', args }),
  };
  const baseStatus: StatusFor['portfolio'] = {
    policyVersion: 1,
    rebalanceCount: 0,
    positionKeys: [],
    accountIdByChain: {},
    flowCount: 0,
  };

  await rebalancePortfolios(
    new Map([
      [
        'portfolio1',
        {
          ...baseStatus,
          accountIdByChain: { noble: 'not-a-caip-account-id' as any },
          targetAllocation: { USDN: 1n },
          enabledAutoFeatures: { rebalance: true },
        },
      ],
      [
        'portfolio2',
        { ...baseStatus, enabledAutoFeatures: { rebalance: true } },
      ],
    ]),
    {
      ...createMockEnginePowers(),
      console: mockConsole,
      isDryRun: true,
      network: TEST_NETWORK,
      signingSmartWalletKit: {} as any,
      walletStore: { get: makeNotImplemented('walletStore.get') } as any,
      getWalletInvocationUpdate: async () => undefined,
      gasEstimator: mockGasEstimator,
      depositBrand: brand,
      feeBrand,
      spectrumBlockchain: {
        getBalances: async ({ accounts }) => ({
          balances: accounts.map(() => ({ balance: '0', error: null })),
        }),
      } as any,
      spectrumChainIds: { noble: 'noble' },
      usdcTokensByChain: { noble: 'uusdc' },
      evmProviders: mockEvmCtx.evmProviders,
      chainNameToChainIdMap: CaipChainIds.testnet,
      gasPrices: makeGasState({}),
      now: () => 1_000_000_000_000,
    },
    0n,
  );

  t.true(
    consoleWrites.some(
      ({ level, args }) =>
        level === 'error' && args[0] === '[rebalance.portfolio1]',
    ),
    'first portfolio error is logged',
  );
  t.true(
    consoleWrites.some(
      ({ level, args }) =>
        level === 'warn' &&
        args[0] === '[rebalance.portfolio2]' &&
        args[1] === 'skipping empty filtered plan',
    ),
    'second portfolio is still processed',
  );
  t.true(
    consoleWrites.some(
      ({ level, args }) =>
        level === 'info' &&
        args[0] === '[rebalance.portfolio2]' &&
        args[1] === 'filtered rebalance plan with current balances:',
    ),
    'second portfolio reaches planning before empty-plan skip',
  );
});
