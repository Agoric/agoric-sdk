/** @file test for deposit tools */
import test from 'ava';

import {
  ACCOUNT_DUST_EPSILON,
  CaipChainIds,
  SupportedChain,
  type StatusFor,
} from '@agoric/portfolio-api';
import { planUSDNDeposit } from '@aglocal/portfolio-contract/test/mocks.js';
import {
  readableSteps,
  readableOrder,
} from '@aglocal/portfolio-contract/test/supports.js';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import type {
  PoolKey,
  PortfolioPublishedPathTypes,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { objectMap } from '@agoric/internal';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { Far } from '@endo/pass-style';
import PROD_NETWORK from '@aglocal/portfolio-contract/tools/network/prod-network.ts';
import { CosmosRestClient, USDN } from '../src/cosmos-rest-client.ts';
import {
  getCurrentBalances,
  getNonDustBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import type { PlannerContext } from '../src/plan-deposit.ts';
import {
  mockEvmCtx,
  mockGasEstimator,
  createMockSpectrumBlockchain,
  LOW_BALANCE_ADDRESS,
} from './mocks.ts';
import type { Sdk as SpectrumBlockchainSdk } from '../src/graphql/api-spectrum-blockchain/__generated/sdk.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const makeDeposit = value => AmountMath.make(depositBrand, value);

const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;

const plannerContext: Omit<
  PlannerContext,
  'currentBalances' | 'targetAllocation'
> = {
  brand: depositBrand,
  network: TEST_NETWORK,
  feeBrand,
  gasEstimator: mockGasEstimator,
};

const emptyPlan = harden({ flow: [], order: undefined });

const makeMovementDesc = (src: string, dest: string, value: bigint) => {
  return { src, dest, amount: { value } };
};

/**
 * Helper for test results
 */
const handleDeposit = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  powers: {
    readPublished: VstorageKit<PortfolioPublishedPathTypes>['readPublished'];
    cosmosRest?: CosmosRestClient;
    gasEstimator: GasEstimator;
    spectrumBlockchain?: SpectrumBlockchainSdk;
    spectrumChainIds?: Partial<Record<SupportedChain, string>>;
    positionTokenAddresses?: Partial<Record<PoolKey, string>>;
    usdcTokensByChain?: Partial<Record<SupportedChain, string>>;
  },
  network: NetworkSpec = TEST_NETWORK,
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { policyVersion, rebalanceCount, targetAllocation } = status;
  if (!targetAllocation) {
    return { policyVersion, rebalanceCount, plan: emptyPlan };
  }
  const currentBalances = await getCurrentBalances(status, amount.brand, {
    spectrumChainIds: powers.spectrumChainIds || {},
    usdcTokensByChain: powers.usdcTokensByChain || {},
    positionTokenAddresses: powers.positionTokenAddresses || {},
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
    cosmosRest: powers.cosmosRest || ({} as unknown as CosmosRestClient),
    ...powers,
  });
  const plan = await planDepositToAllocations({
    amount,
    brand: amount.brand,
    currentBalances,
    targetAllocation,
    network,
    feeBrand,
    gasEstimator: powers.gasEstimator,
  });
  return { policyVersion, rebalanceCount, plan };
};

test('USDN denom', t => {
  t.is(USDN.base, 'uusdn');
});

test('getNonDustBalances filters balances at or below the dust epsilon', async t => {
  const status = {
    positionKeys: ['Aave_Arbitrum', 'Compound_Base'],
    accountIdByChain: {
      Arbitrum: `eip155:42161:${LOW_BALANCE_ADDRESS}`,
      Base: 'eip155:8453:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
  } as any;

  const mockCosmosRestClient = {
    async getAccountBalance() {
      throw new Error('unexpected Cosmos balance request');
    },
  } as unknown as CosmosRestClient;

  const balances = await getNonDustBalances(status, depositBrand, {
    cosmosRest: mockCosmosRestClient,
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumChainIds: { Arbitrum: '0xa4b1', Base: '0x2105' },
    usdcTokensByChain: {
      Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    positionTokenAddresses: {
      Aave_Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      Compound_Base: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    chainNameToChainIdMap: CaipChainIds.mainnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['Compound_Base']);
  t.false(Object.hasOwn(balances, 'Aave_Arbitrum'));
  t.is(balances.Compound_Base!.value, 1000n);
});

test('getNonDustBalances retains noble balances above the dust epsilon', async t => {
  const status = {
    positionKeys: ['USDN'],
    accountIdByChain: {
      noble: 'chain:mock:addr-noble',
    },
  } as any;

  const mockCosmosRestClient = {
    async getAccountBalance(chainName: string, addr: string, denom: string) {
      t.is(chainName, 'noble');
      t.is(denom, 'uusdn');
      t.truthy(addr);
      return { denom, amount: '101' };
    },
  } as unknown as CosmosRestClient;

  const balances = await getNonDustBalances(status, depositBrand, {
    cosmosRest: mockCosmosRestClient,
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 101 }),
    spectrumChainIds: { noble: 'noble-1' },
    usdcTokensByChain: { noble: 'uusdc' },
    positionTokenAddresses: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['USDN']);
  t.is(balances.USDN!.value, 101_000_000n);
});

test('handleDeposit works with mocked dependencies', async t => {
  const portfolioKey = 'test.portfolios.portfolio1' as const;
  const targetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };
  const initialBalances = {
    USDN: 5000n,
    Aave_Arbitrum: 1000n,
    Compound_Arbitrum: 1000n,
  };
  const toDeposit = 93_000n;
  const deposit = makeDeposit(toDeposit);

  // Mock VstorageKit readPublished
  const mockReadPublished = async (path: string) => {
    if (path === portfolioKey) {
      return {
        positionKeys: ['USDN', 'Aave_Arbitrum', 'Compound_Arbitrum'],
        flowCount: 0,
        accountIdByChain: {
          noble: 'cosmos:grand-1:noble1test',
          Arbitrum: 'eip155:42161:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        },
        targetAllocation,
        policyVersion: 4,
        rebalanceCount: 2,
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  // Mock VstorageKit
  const mockVstorageKit: Pick<
    VstorageKit<PortfolioPublishedPathTypes>,
    'readPublished'
  > = {
    readPublished:
      mockReadPublished as VstorageKit<PortfolioPublishedPathTypes>['readPublished'],
  };

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.005 }),
    spectrumChainIds: {
      noble: 'noble-1',
      Arbitrum: '0xa4b1',
    },
    positionTokenAddresses: {
      Aave_Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      Compound_Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    usdcTokensByChain: {
      noble: 'uusdc',
      Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    cosmosRest: {} as unknown as CosmosRestClient,
    gasEstimator: mockGasEstimator,
  });

  const totalDeposit =
    toDeposit +
    initialBalances.USDN +
    initialBalances.Aave_Arbitrum +
    initialBalances.Compound_Arbitrum;

  const usdnAllocation = (totalDeposit * targetAllocation.USDN) / 100n;
  const aaveAllocation = (totalDeposit * targetAllocation.Aave_Arbitrum) / 100n;
  const compoundAllocation =
    (totalDeposit * targetAllocation.Compound_Arbitrum) / 100n;

  arrayIsLike(t, result.plan.flow, [
    makeMovementDesc('<Deposit>', '@agoric', deposit.value),
    makeMovementDesc('@agoric', '@noble', deposit.value),
    makeMovementDesc('@noble', 'USDN', usdnAllocation - initialBalances.USDN),
    makeMovementDesc(
      '@noble',
      '@Arbitrum',
      usdnAllocation -
        initialBalances.Aave_Arbitrum -
        initialBalances.Compound_Arbitrum,
    ),
    makeMovementDesc(
      '@Arbitrum',
      'Aave_Arbitrum',
      aaveAllocation - initialBalances.Aave_Arbitrum,
    ),
    makeMovementDesc(
      '@Arbitrum',
      'Compound_Arbitrum',
      compoundAllocation - initialBalances.Compound_Arbitrum,
    ),
  ]);
  t.snapshot(result);
});

test('handleDeposit handles missing targetAllocation gracefully', async t => {
  const deposit = makeDeposit(1000n);
  const portfolioKey = 'test.portfolios.portfolio1' as const;

  // Mock VstorageKit readPublished with no targetAllocation
  const mockReadPublished = async (path: string) => {
    if (path === portfolioKey) {
      return {
        positionKeys: ['USDN', 'Aave_Arbitrum'],
        flowCount: 0,
        accountIdByChain: {
          noble: 'cosmos:grand-1:noble1test',
          Arbitrum: 'eip155:42161:0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
        },
        // No targetAllocation
        policyVersion: 4,
        rebalanceCount: 0,
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  // Mock VstorageKit
  const mockVstorageKit: Pick<
    VstorageKit<PortfolioPublishedPathTypes>,
    'readPublished'
  > = {
    readPublished:
      mockReadPublished as VstorageKit<PortfolioPublishedPathTypes>['readPublished'],
  };

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    gasEstimator: mockGasEstimator,
  });

  t.deepEqual(result, { policyVersion: 4, rebalanceCount: 0, plan: emptyPlan });
});

test('handleDeposit handles different position types correctly', async t => {
  const deposit = makeDeposit(1_000_000n);
  const portfolioKey = 'test.portfolios.portfolio1' as const;

  // Mock VstorageKit readPublished with various position types
  const mockReadPublished = async (path: string) => {
    if (path === portfolioKey) {
      return {
        positionKeys: [
          'USDN',
          'USDNVault',
          'Aave_Avalanche',
          'Compound_Ethereum',
        ],
        flowCount: 0,
        accountIdByChain: {
          noble: 'cosmos:grand-1:noble1test',
          Avalanche: 'eip155:43113:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          Ethereum: 'eip155:1:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        },
        targetAllocation: {
          USDN: 40n,
          USDNVault: 20n,
          Aave_Avalanche: 25n,
          Compound_Ethereum: 15n,
        },
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  // Mock VstorageKit
  const mockVstorageKit: Pick<
    VstorageKit<PortfolioPublishedPathTypes>,
    'readPublished'
  > = {
    readPublished:
      mockReadPublished as VstorageKit<PortfolioPublishedPathTypes>['readPublished'],
  };

  const result = await handleDeposit(
    portfolioKey,
    deposit,
    feeBrand,
    {
      readPublished: mockVstorageKit.readPublished,
      spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.3 }),
      spectrumChainIds: {
        noble: 'noble-1',
        Avalanche: '0xa86a',
        Ethereum: '0x1',
      },
      positionTokenAddresses: {
        Aave_Avalanche: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        Compound_Ethereum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      },
      usdcTokensByChain: {
        noble: 'uusdc',
        Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      cosmosRest: {} as unknown as CosmosRestClient,
      gasEstimator: mockGasEstimator,
    },
    TEST_NETWORK,
  );
  const plan = result?.plan;
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planRebalanceToAllocations emits an empty plan when already balanced', async t => {
  const targetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    targetAllocation,
    currentBalances: objectMap(targetAllocation, v => makeDeposit(v * 200n)),
  });
  t.deepEqual(plan, emptyPlan);
});

// https://github.com/Agoric/agoric-private/issues/623
test('planRebalanceToAllocations emits an empty plan when almost balanced', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 25n,
    Aave_Avalanche: 50n,
    Compound_Ethereum: 25n,
  };
  const currentBalanceValues = {
    Aave_Arbitrum: 25_000_000n - ACCOUNT_DUST_EPSILON + 1n,
    Aave_Avalanche: 50_000_000n + 2n * ACCOUNT_DUST_EPSILON - 2n,
    Compound_Ethereum: 25_000_000n - ACCOUNT_DUST_EPSILON + 1n,
  };
  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    targetAllocation,
    currentBalances: objectMap(currentBalanceValues, v => makeDeposit(v)),
  });
  t.deepEqual(plan, emptyPlan);
});

test('planRebalanceToAllocations moves funds when needed', async t => {
  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    targetAllocation: {
      USDN: 40n,
      USDNVault: 0n,
      Aave_Arbitrum: 40n,
      Compound_Arbitrum: 20n,
    },
    currentBalances: { USDN: makeDeposit(1000n) },
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations withdraws and rebalances', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 40n, Aave_Arbitrum: 40n, Compound_Arbitrum: 20n },
    currentBalances: { USDN: makeDeposit(2000n) },
    amount: makeDeposit(1000n),
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations can withdraw to an EVM account', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 40n, Aave_Arbitrum: 40n, Compound_Arbitrum: 20n },
    currentBalances: { USDN: makeDeposit(2000n) },
    amount: makeDeposit(1000n),
    toChain: 'Ethereum',
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations considers former allocation targets', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { Compound_Arbitrum: 100n },
    currentBalances: {
      Aave_Avalanche: makeDeposit(1000n),
      Compound_Arbitrum: makeDeposit(1000n),
    },
    amount: makeDeposit(1200n),
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations with no target preserves relative positions', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: {},
    currentBalances: {
      '@Arbitrum': makeDeposit(200n),
      USDN: makeDeposit(800n),
      Aave_Arbitrum: makeDeposit(800n),
      Compound_Arbitrum: makeDeposit(400n),
    },
    amount: makeDeposit(1200n),
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations with no target and no positions preserves relative amounts', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: {},
    currentBalances: {
      '@Arbitrum': makeDeposit(1000n),
      '@noble': makeDeposit(1000n),
    },
    amount: makeDeposit(1000n),
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planDepositToAllocations produces plan expected by contract', async t => {
  const amount = makeDeposit(1000n);
  const actual = await planDepositToAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 1n },
    currentBalances: {},
    amount,
  });

  const expected = planUSDNDeposit(amount);
  t.deepEqual(actual, expected);
});

test('planDepositToAllocations can deposit from an EVM account', async t => {
  const amount = makeDeposit(1000n);
  const plan = await planDepositToAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 1n },
    currentBalances: {},
    amount,
    fromChain: 'Avalanche',
  });

  const expectedFlow = [
    { amount, src: '+Avalanche', dest: '@Avalanche' },
    { amount, src: '@Avalanche', dest: '@agoric' },
    { amount, src: '@agoric', dest: '@noble' },
    { amount, src: '@noble', dest: 'USDN' },
  ];
  arrayIsLike(t, plan?.flow, expectedFlow);
});

async function singleSourceRebalanceSteps(scale: number) {
  const targetAllocation = {
    Aave_Arbitrum: 10n,
    Aave_Avalanche: 11n,
    Aave_Base: 11n,
    Aave_Ethereum: 10n,
    Aave_Optimism: 10n,
  };

  const currentBalances = {
    Aave_Avalanche: makeDeposit(3750061n * BigInt(scale)),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
  });
  return plan;
}

test('planRebalanceToAllocations regression - single source, 2x', async t => {
  const plan = await singleSourceRebalanceSteps(2);
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planRebalanceToAllocations regression - single source, 10x', async t => {
  const plan = await singleSourceRebalanceSteps(10);
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planRebalanceToAllocations regression - multiple sources', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 10n,
    Aave_Avalanche: 11n,
    Aave_Base: 11n,
    Aave_Ethereum: 10n,
    Aave_Optimism: 10n,
    Compound_Arbitrum: 5n,
    Compound_Base: 10n,
    Compound_Ethereum: 10n,
    Compound_Optimism: 23n,
  };

  const currentBalances = {
    Aave_Avalanche: makeDeposit(3750061n),
    Aave_Base: makeDeposit(4800007n),
    Aave_Optimism: makeDeposit(3600002n),
    Compound_Arbitrum: makeDeposit(2849999n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('getNonDustBalances works for erc4626 vaults', async t => {
  const status = {
    accountIdByChain: {
      Ethereum: 'eip155:11155111:0xbcc48e14f89f2bff20a7827148b466ae8f2fbc9b',
      agoric:
        'cosmos:agoricdev-25:agoric1gwcndgrd72vuj56jsp5dw26wq4tnzylj79vx8tpq5yc93xcm26js6x3k38',
      noble:
        'cosmos:grand-1:noble1utnnvgvratte5ulr4w28fd464g3shjl0z87fue9mkrljnr0t8mlst7h8uq',
    },
    accountsPending: [],
    depositAddress:
      'agoric17h7u4j564tuh04pfnf0ptjcarnhrmuja9w4u6phzrncs35up3ltshqqd0r',
    flowCount: 0,
    nobleForwardingAddress: 'noble18ppsadxr545ll6xdxw4mfr9r9le6gwukewy30c',
    policyVersion: 1,
    positionKeys: ['ERC4626_vaultU2_Ethereum'],
    rebalanceCount: 2,
    targetAllocation: {
      ERC4626_vaultU2_Ethereum: 100n,
    },
  } as StatusFor['portfolio'];

  const balances = await getNonDustBalances(status, depositBrand, {
    cosmosRest: {} as unknown as CosmosRestClient,
    spectrumChainIds: {
      Ethereum: '0xaaa',
      agoric: 'agoricdev-25',
      noble: 'grand-1',
    },
    positionTokenAddresses: {
      ERC4626_vaultU2_Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    usdcTokensByChain: {
      Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      agoric: 'uusdc',
      noble: 'uusdc',
    },
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['ERC4626_vaultU2_Ethereum']);
  t.is(balances.ERC4626_vaultU2_Ethereum!.value, 3000n);
});

// ============= CCTPv2 Route Selection Tests =============

test('planRebalanceToAllocations prefers CCTPv2 for EVM-to-EVM (Base → Avalanche)', async t => {
  const targetAllocation = {
    Aave_Avalanche: 100n, // All funds to Avalanche
  };
  const currentBalances = {
    Aave_Base: makeDeposit(10_000_000n), // Starting on Base
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
  });

  // Should have: Base (withdraw) → @Base → @Avalanche (CCTPv2) → Aave_Avalanche (supply)
  // NOT: Base → @Base → @noble → @Avalanche → Aave_Avalanche
  const movements = plan.flow;

  // Find the cross-chain transfer step
  const crossChainStep = movements.find(
    m => m.src === '@Base' && m.dest === '@Avalanche',
  );
  t.truthy(crossChainStep, 'Should have direct Base → Avalanche step');
  t.deepEqual(
    crossChainStep?.detail,
    { cctpVersion: 2n },
    'Should use CCTPv2 (detail.cctpVersion = 2n)',
  );
});

test('planRebalanceToAllocations routes to Noble via CCTPv1 (not CCTPv2)', async t => {
  const targetAllocation = {
    USDN: 100n, // All funds to Noble's USDN
  };
  const currentBalances = {
    Aave_Base: makeDeposit(10_000_000n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
  });

  // The final step to Noble or USDN should NOT use CCTPv2 (which can't reach Cosmos)
  // It should use CCTPv1 via @noble or @agoric
  const toNobleOrUsdn = plan.flow.filter(
    m => m.dest === '@noble' || m.dest === 'USDN',
  );

  t.true(toNobleOrUsdn.length > 0, 'Should have steps reaching Noble/USDN');

  for (const step of toNobleOrUsdn) {
    // Steps to Noble/USDN cannot use CCTPv2 (detail.cctpVersion = 2n)
    t.not(
      step.detail?.cctpVersion,
      2n,
      `Step ${step.src} → ${step.dest} should not use CCTPv2`,
    );
  }

  // Verify at least one step reaches USDN (the final destination)
  const toUsdn = plan.flow.find(m => m.dest === 'USDN');
  t.truthy(toUsdn, 'Should have step to USDN');
});

test('planRebalanceToAllocations uses CCTPv2 for multi-EVM rebalance', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 25n,
    Aave_Avalanche: 25n,
    Aave_Base: 25n,
    Aave_Ethereum: 25n,
  };
  const currentBalances = {
    Aave_Base: makeDeposit(40_000_000n), // All on Base, need to spread
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
  });

  // All EVM-to-EVM transfers should use CCTPv2
  const evmToEvmSteps = plan.flow.filter(
    m =>
      m.src.startsWith('@') &&
      m.dest.startsWith('@') &&
      !['@agoric', '@noble'].includes(m.src) &&
      !['@agoric', '@noble'].includes(m.dest),
  );

  t.true(evmToEvmSteps.length > 0, 'Should have EVM-to-EVM transfer steps');
  for (const step of evmToEvmSteps) {
    t.deepEqual(
      step.detail,
      { cctpVersion: 2n },
      `Step ${step.src} → ${step.dest} should use CCTPv2`,
    );
  }
});

// Disabled per https://github.com/Agoric/agoric-private/issues/768
test.failing(
  'planRebalanceToAllocations selects correct routes for Base → Avalanche + Noble split',
  async t => {
    // Starting: Funds on Base
    // Goal: Split between Avalanche Aave and Noble USDN
    // Expected:
    //   - Base → Avalanche via CCTPv2 (direct, ~60s)
    //   - Base → Noble via CCTPv1 (via @agoric, ~1080s)
    // CCTPv2 should NOT be used for the Noble leg

    const targetAllocation = {
      Aave_Avalanche: 50n,
      USDN: 50n,
    };
    const currentBalances = {
      Aave_Base: makeDeposit(20_000_000n),
    };

    const plan = await planRebalanceToAllocations({
      ...plannerContext,
      currentBalances,
      targetAllocation,
      network: PROD_NETWORK, // XXX why doesn't this work with the test net???
    });

    // Check Avalanche route uses CCTPv2
    const toAvalancheStep = plan.flow.find(
      m => m.src === '@Base' && m.dest === '@Avalanche',
    );
    t.truthy(toAvalancheStep, 'Should have Base → Avalanche step');
    t.deepEqual(
      toAvalancheStep?.detail,
      { cctpVersion: 2n },
      'Avalanche route should use CCTPv2',
    );

    // Snapshot the full plan for regression tracking
    t.snapshot(plan, 'Base to Avalanche + Noble split routing');
  },
);

test('planRebalanceToAllocations regression - CCTPv2 multi-source rebalance', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 25n,
    Aave_Avalanche: 25n,
    Aave_Base: 25n,
    Aave_Ethereum: 25n,
  };
  const currentBalances = {
    Aave_Base: makeDeposit(5_000_000n),
    Aave_Optimism: makeDeposit(5_000_000n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
  });

  t.snapshot(plan, 'CCTPv2 multi-source rebalance');
});
