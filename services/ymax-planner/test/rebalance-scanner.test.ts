import test from 'ava';

import { Far } from '@endo/pass-style';
import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp';
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import { CaipChainIds } from '@agoric/portfolio-api/src/constants.js';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';

import {
  filterGasFavorablePlan,
  scanRebalanceOnce,
} from '../src/rebalance-scanner.ts';
import {
  createMockEnginePowers,
  makeNotImplemented,
  mockEvmCtx,
  mockGasEstimator,
} from './mocks.ts';

const brand = Far('USDC brand') as unknown as Brand<'nat'>;
const feeBrand = Far('Fee brand') as unknown as Brand<'nat'>;
const makeAmount = (value: bigint) => AmountMath.make(brand, value);

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

  const filtered = filterGasFavorablePlan(plan, {
    Ethereum: 1_000n,
    Arbitrum: 1n,
    Base: 1n,
  });

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

  const filtered = filterGasFavorablePlan(plan, {
    Ethereum: 1_000n,
    Base: 1n,
    Optimism: 1n,
  });

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

test('scanRebalanceOnce logs per-portfolio errors and continues', async t => {
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

  await scanRebalanceOnce(
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
      queryPortfolios: async () => [
        {
          portfolioKey: 'portfolio1',
          status: {
            ...baseStatus,
            accountIdByChain: { noble: 'not-a-caip-account-id' as any },
            targetAllocation: { USDN: 1n },
          },
        },
        {
          portfolioKey: 'portfolio2',
          status: baseStatus,
        },
      ],
      queryGasPrices: async () => 0n,
      sleep: async () => {},
      now: () => 1_000_000_000_000,
    },
    60,
  );

  t.true(
    consoleWrites.some(
      ({ level, args }) =>
        level === 'error' && args[0] === '[rebalance-scanner.portfolio1]',
    ),
    'first portfolio error is logged',
  );
  t.true(
    consoleWrites.some(
      ({ level, args }) =>
        level === 'warn' &&
        args[0] === '[rebalance-scanner.portfolio2]' &&
        args[1] === 'skipping empty gas-favorable plan',
    ),
    'second portfolio is still processed',
  );
});
