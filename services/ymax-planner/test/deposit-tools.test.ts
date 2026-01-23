/** @file test for deposit tools */
import test from 'ava';

import {
  ACCOUNT_DUST_EPSILON,
  CaipChainIds,
  SupportedChain,
  type StatusFor,
} from '@agoric/portfolio-api';
import { planUSDNDeposit } from '@aglocal/portfolio-contract/test/mocks.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/tools/network/prod-network.ts';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type {
  NetworkSpec,
  PoolKey,
} from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { objectMap } from '@agoric/internal';
import { Far } from '@endo/pass-style';
import { CosmosRestClient, USDN } from '../src/cosmos-rest-client.ts';
import {
  getCurrentBalances,
  getNonDustBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import { SpectrumClient } from '../src/spectrum-client.ts';
import {
  erc4626VaultsMock,
  mockEvmCtx,
  mockGasEstimator,
  createMockSpectrumBlockchain,
  createMockSpectrumPools,
} from './mocks.ts';
import type { Sdk as SpectrumBlockchainSdk } from '../src/graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { Sdk as SpectrumPoolsSdk } from '../src/graphql/api-spectrum-pools/__generated/sdk.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const makeDeposit = value => AmountMath.make(depositBrand, value);

const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;

const emptyPlan = harden({ flow: [], order: undefined });

/**
 * Helper for test results
 */
const handleDeposit = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  powers: {
    readPublished: VstorageKit['readPublished'];
    spectrum: SpectrumClient;
    cosmosRest?: CosmosRestClient;
    gasEstimator: GasEstimator;
    spectrumBlockchain?: SpectrumBlockchainSdk;
    spectrumPools?: SpectrumPoolsSdk;
    spectrumChainIds?: Partial<Record<SupportedChain, string>>;
    spectrumPoolIds?: Partial<Record<PoolKey, string>>;
    usdcTokensByChain?: Partial<Record<SupportedChain, string>>;
  },
  network: NetworkSpec = PROD_NETWORK,
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { policyVersion, rebalanceCount, targetAllocation } = status;
  if (!targetAllocation) {
    return { policyVersion, rebalanceCount, plan: emptyPlan };
  }
  const currentBalances = await getCurrentBalances(status, amount.brand, {
    spectrumChainIds: powers.spectrumChainIds || {},
    spectrumPoolIds: powers.spectrumPoolIds || {},
    usdcTokensByChain: powers.usdcTokensByChain || {},
    erc4626VaultAddresses: {},
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumPools: createMockSpectrumPools({}),
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
      Arbitrum: 'eip155:42161:0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
      Base: 'eip155:8453:0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb',
    },
  } as any;

  const spectrumStub = {
    async getPoolBalance() {
      throw new Error('unexpected Spectrum balance request');
    },
  } as unknown as SpectrumClient;

  const mockCosmosRestClient = {
    async getAccountBalance() {
      throw new Error('unexpected Cosmos balance request');
    },
  } as unknown as CosmosRestClient;

  const balances = await getNonDustBalances(status, depositBrand, {
    cosmosRest: mockCosmosRestClient,
    spectrum: spectrumStub,
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumPools: createMockSpectrumPools({
      Aave_Arbitrum: 100n,
      Compound_Base: 150n,
    }),
    spectrumChainIds: { Arbitrum: '0xa4b1', Base: '0x2105' },
    spectrumPoolIds: {
      Aave_Arbitrum: 'Aave_Arbitrum',
      Compound_Base: 'Compound_Base',
    },
    usdcTokensByChain: {
      Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    erc4626VaultAddresses: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['Compound_Base']);
  t.false(Object.hasOwn(balances, 'Aave_Arbitrum'));
  t.is(balances.Compound_Base!.value, 150n);
});

test('getNonDustBalances retains noble balances above the dust epsilon', async t => {
  const status = {
    positionKeys: ['USDN'],
    accountIdByChain: {
      noble: 'chain:mock:addr-noble',
    },
  } as any;

  const spectrumStub = {
    async getPoolBalance() {
      throw new Error('unexpected Spectrum balance request');
    },
  } as unknown as SpectrumClient;

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
    spectrum: spectrumStub,
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 101 }),
    spectrumPools: createMockSpectrumPools({}),
    spectrumChainIds: { noble: 'noble-1' },
    spectrumPoolIds: {},
    usdcTokensByChain: { noble: 'uusdc' },
    erc4626VaultAddresses: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['USDN']);
  t.is(balances.USDN!.value, 101_000_000n);
});

/**
 * Deposit: 1000n
 * TargetAllocation:
 *   USDN: 50%
 *   Aave_Arbitrum: 30%
 *   Compound_Arbitrum: 20%
 
 * CurrentBalance:
 *   Noble: 200n,
 *   Aave_Arbitrum: 100n,
 *   Compound_Arlanbitrum: 50n,
 * 
 * Expected:
 *   USDN: 675n, +675n, 475n from deposit, 200n Noble
 *   Aave_Arbitrum: 405n, +305n
 *   Compound_Arbitrum: 270n, +220n
 */
test('handleDeposit works with mocked dependencies', async t => {
  const deposit = makeDeposit(1000n);
  const portfolioKey = 'test.portfolios.portfolio1' as const;

  // Mock VstorageKit readPublished
  const mockReadPublished = async (path: string) => {
    if (path === portfolioKey) {
      return {
        positionKeys: ['USDN', 'Aave_Arbitrum', 'Compound_Arbitrum'],
        flowCount: 0,
        accountIdByChain: {
          noble: 'cosmos:grand-1:noble1test',
          Arbitrum: 'eip155:42161:0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
        },
        targetAllocation: {
          USDN: 50n,
          Aave_Arbitrum: 30n,
          Compound_Arbitrum: 20n,
        },
        policyVersion: 4,
        rebalanceCount: 2,
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  const spectrumStub = {
    async getPoolBalance() {
      throw new Error('unexpected Spectrum balance request');
    },
  } as unknown as SpectrumClient;

  // Mock VstorageKit
  const mockVstorageKit: VstorageKit = {
    readPublished: mockReadPublished,
  } as VstorageKit;

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrum: spectrumStub,
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.0002 }),
    spectrumPools: createMockSpectrumPools({
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 50n,
    }),
    spectrumChainIds: {
      noble: 'noble-1',
      Arbitrum: '0xa4b1',
    },
    spectrumPoolIds: {
      Aave_Arbitrum: 'Aave_Arbitrum',
      Compound_Arbitrum: 'Compound_Arbitrum',
    },
    usdcTokensByChain: {
      noble: 'uusdc',
      Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    cosmosRest: {} as unknown as CosmosRestClient,
    gasEstimator: mockGasEstimator,
  });
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

  const spectrumStub = {
    async getPoolBalance() {
      throw new Error('unexpected Spectrum balance request');
    },
  } as unknown as SpectrumClient;

  // Mock VstorageKit
  const mockVstorageKit: VstorageKit = {
    readPublished: mockReadPublished,
  } as VstorageKit;

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrum: spectrumStub,
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumPools: createMockSpectrumPools({}),
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
          Avalanche: 'eip155:43114:0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
          Ethereum: 'eip155:1:0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb',
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

  const spectrumStub = {
    async getPoolBalance() {
      throw new Error('unexpected Spectrum balance request');
    },
  } as unknown as SpectrumClient;

  // Mock VstorageKit
  const mockVstorageKit: VstorageKit = {
    readPublished: mockReadPublished,
  } as VstorageKit;

  const result = await handleDeposit(
    portfolioKey,
    deposit,
    feeBrand,
    {
      readPublished: mockVstorageKit.readPublished,
      spectrum: spectrumStub,
      spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.3 }),
      spectrumPools: createMockSpectrumPools({
        Aave_Avalanche: 150_000n,
        Compound_Ethereum: 75_000n,
      }),
      spectrumChainIds: {
        noble: 'noble-1',
        Avalanche: '0xa86a',
        Ethereum: '0x1',
      },
      spectrumPoolIds: {
        Aave_Avalanche: 'Aave_Avalanche',
        Compound_Ethereum: 'Compound_Ethereum',
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
  t.snapshot(result?.plan);
});

test('planRebalanceToAllocations emits an empty plan when already balanced', async t => {
  const targetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const currentBalances = objectMap(targetAllocation, v =>
    makeDeposit(v * 200n),
  );
  const plan = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
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
    brand: depositBrand,
    currentBalances: objectMap(currentBalanceValues, v => makeDeposit(v)),
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.deepEqual(plan, emptyPlan);
});

test('planRebalanceToAllocations moves funds when needed', async t => {
  const targetAllocation = {
    USDN: 40n,
    USDNVault: 0n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const currentBalances = { USDN: makeDeposit(1000n) };
  const plan = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
});

test('planWithdrawFromAllocations withdraws and rebalances', async t => {
  const targetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const currentBalances = { USDN: makeDeposit(2000n) };
  const plan = await planWithdrawFromAllocations({
    amount: makeDeposit(1000n),
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
});

test('planWithdrawFromAllocations considers former allocation targets', async t => {
  const currentBalances = {
    Aave_Avalanche: makeDeposit(1000n),
    Compound_Arbitrum: makeDeposit(1000n),
  };
  const plan = await planWithdrawFromAllocations({
    amount: makeDeposit(1200n),
    brand: depositBrand,
    currentBalances,
    targetAllocation: { Compound_Arbitrum: 100n },
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
});

test('planWithdrawFromAllocations with no target preserves relative positions', async t => {
  const currentBalances = {
    '@Arbitrum': makeDeposit(200n),
    USDN: makeDeposit(800n),
    Aave_Arbitrum: makeDeposit(800n),
    Compound_Arbitrum: makeDeposit(400n),
  };
  const plan = await planWithdrawFromAllocations({
    amount: makeDeposit(1200n),
    brand: depositBrand,
    currentBalances,
    targetAllocation: {},
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
});

test('planWithdrawFromAllocations with no target and no positions preserves relative amounts', async t => {
  const currentBalances = {
    '@Arbitrum': makeDeposit(1000n),
    '@noble': makeDeposit(1000n),
  };
  const plan = await planWithdrawFromAllocations({
    amount: makeDeposit(1000n),
    brand: depositBrand,
    currentBalances,
    targetAllocation: {},
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
});

test('planDepositToAllocations produces plan expected by contract', async t => {
  const USDC = depositBrand;
  const BLD = feeBrand;
  const amount = makeDeposit(1000n);

  const network = PROD_NETWORK;
  const actual = await planDepositToAllocations({
    amount,
    brand: USDC,
    currentBalances: {},
    feeBrand: BLD,
    gasEstimator: null as any,
    network,
    targetAllocation: { USDN: 1n },
  });

  const expected = planUSDNDeposit(amount);
  t.deepEqual(actual, expected);
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
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    // TODO: Refactor this test against a stable network dedicated to testing.
    network: PROD_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  return plan;
}

test('planRebalanceToAllocations regression - single source', async t => {
  // TODO: For human comprehensibility, adopt something like `readableSteps`
  // from packages/portfolio-contract/test/rebalance.test.ts.
  const plan = await singleSourceRebalanceSteps(1);
  t.snapshot(plan);
});

test('planRebalanceToAllocations regression - single source, 10x', async t => {
  const plan = await singleSourceRebalanceSteps(10);
  t.snapshot(plan);
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
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    // TODO: Refactor this test against a stable network dedicated to testing.
    network: PROD_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(plan);
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
    spectrum: {} as unknown as SpectrumClient,
    spectrumChainIds: {
      Ethereum: '0xaaa',
      agoric: 'agoricdev-25',
      noble: 'grand-1',
    },
    spectrumPoolIds: {},
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumPools: createMockSpectrumPools({}),
    usdcTokensByChain: {
      Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      agoric: 'uusdc',
      noble: 'uusdc',
    },
    erc4626VaultAddresses: erc4626VaultsMock,
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['ERC4626_vaultU2_Ethereum']);
  t.is(balances.ERC4626_vaultU2_Ethereum!.value, 3000n);
});
