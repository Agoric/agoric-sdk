/** @file test for deposit tools */
/* eslint-disable max-classes-per-file, class-methods-use-this */
import test from 'ava';

import {
  ACCOUNT_DUST_EPSILON,
  CaipChainIds,
  type StatusFor,
} from '@agoric/portfolio-api';
import { planUSDNDeposit } from '@aglocal/portfolio-contract/test/mocks.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/tools/network/prod-network.ts';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
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
import { erc4626VaultsMock, mockEvmCtx, mockGasEstimator } from './mocks.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const makeDeposit = value => AmountMath.make(depositBrand, value);

const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;

const powers = { fetch, setTimeout };

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
    cosmosRest: CosmosRestClient;
    gasEstimator: GasEstimator;
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
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
    erc4626Vaults: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
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
      Arbitrum: 'chain:mock:addr-arb',
      Base: 'chain:mock:addr-base',
    },
  } as any;

  class MockSpectrumClientDust extends SpectrumClient {
    constructor() {
      super(powers);
    }

    async getPoolBalance(chain: any, pool: any, addr: any) {
      if (chain === 'arbitrum' && pool === 'aave') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 100, borrowAmount: 0 },
        };
      }
      if (chain === 'base' && pool === 'compound') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 150, borrowAmount: 0 },
        };
      }
      return {
        pool,
        chain,
        address: addr,
        balance: { supplyBalance: 0, borrowAmount: 0 },
      };
    }
  }
  const mockSpectrumClient = new MockSpectrumClientDust();
  const mockCosmosRestClient = {
    async getAccountBalance() {
      throw new Error('unexpected Cosmos balance request');
    },
  } as unknown as CosmosRestClient;

  const balances = await getNonDustBalances(status, depositBrand, {
    cosmosRest: mockCosmosRestClient,
    spectrum: mockSpectrumClient,
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
    erc4626Vaults: {},
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
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
    erc4626Vaults: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['USDN']);
  t.is(balances.USDN!.value, 101n);
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
          noble: 'noble:test:addr1',
          Arbitrum: 'arbitrum:test:addr2',
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

  // Mock SpectrumClient
  class MockSpectrumClient extends SpectrumClient {
    constructor() {
      super(powers);
    }

    async getPoolBalance(chain: any, pool: any, addr: any) {
      // Return different balances for different pools
      if (pool === 'aave' && chain === 'arbitrum') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 100, borrowAmount: 0 },
        };
      }
      if (pool === 'compound' && chain === 'arbitrum') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 50, borrowAmount: 0 },
        };
      }
      return {
        pool,
        chain,
        address: addr,
        balance: { supplyBalance: 0, borrowAmount: 0 },
      };
    }
  }
  const mockSpectrumClient = new MockSpectrumClient();

  // Mock CosmosRestClient
  class MockCosmosRestClient extends CosmosRestClient {
    constructor() {
      super(powers);
    }

    async getAccountBalance(chainName: string, addr: string, denom: string) {
      if (chainName === 'noble' && denom === 'uusdn') {
        return { denom, amount: '200' };
      }
      return { denom, amount: '0' };
    }
  }
  const mockCosmosRestClient = new MockCosmosRestClient();

  // Mock VstorageKit
  const mockVstorageKit: VstorageKit = {
    readPublished: mockReadPublished,
  } as VstorageKit;

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrum: mockSpectrumClient,
    cosmosRest: mockCosmosRestClient,
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
          noble: 'noble:test:addr1',
          Arbitrum: 'arbitrum:test:addr2',
        },
        // No targetAllocation
        policyVersion: 4,
        rebalanceCount: 0,
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  // Mock SpectrumClient
  class MockSpectrumClient2 extends SpectrumClient {
    constructor() {
      super(powers);
    }

    async getPoolBalance(chain: any, pool: any, addr: any) {
      return {
        pool,
        chain,
        address: addr,
        balance: { supplyBalance: 0, borrowAmount: 0 },
      };
    }
  }
  const mockSpectrumClient = new MockSpectrumClient2();

  // Mock CosmosRestClient
  class MockCosmosRestClient2 extends CosmosRestClient {
    constructor() {
      super(powers);
    }

    async getAccountBalance(chainName: string, addr: string, denom: string) {
      return { denom, amount: '0' };
    }
  }
  const mockCosmosRestClient = new MockCosmosRestClient2();

  // Mock VstorageKit
  const mockVstorageKit: VstorageKit = {
    readPublished: mockReadPublished,
  } as VstorageKit;

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrum: mockSpectrumClient,
    cosmosRest: mockCosmosRestClient,
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
          noble: 'noble:test:addr1',
          Avalanche: 'example:avalanche:addr2',
          Ethereum: 'example:ethereum:addr3',
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

  // Mock SpectrumClient with different chain responses
  class MockSpectrumClient3 extends SpectrumClient {
    constructor() {
      super(powers);
    }

    async getPoolBalance(chain: any, pool: any, addr: any) {
      if (chain === 'avalanche' && pool === 'aave') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 150_000, borrowAmount: 0 },
        };
      }
      if (chain === 'ethereum' && pool === 'compound') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 75_000, borrowAmount: 0 },
        };
      }
      return {
        pool,
        chain,
        address: addr,
        balance: { supplyBalance: 0, borrowAmount: 0 },
      };
    }
  }
  const mockSpectrumClient = new MockSpectrumClient3();

  // Mock CosmosRestClient
  class MockCosmosRestClient3 extends CosmosRestClient {
    constructor() {
      super(powers);
    }

    async getAccountBalance(chainName: string, addr: string, denom: string) {
      if (chainName === 'noble' && denom === 'uusdn') {
        return { denom, amount: '300000' };
      }
      return { denom, amount: '0' };
    }
  }
  const mockCosmosRestClient = new MockCosmosRestClient3();

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
      spectrum: mockSpectrumClient,
      cosmosRest: mockCosmosRestClient,
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
    spectrumChainIds: {},
    spectrumPoolIds: {},
    usdcTokensByChain: {},
    erc4626Vaults: erc4626VaultsMock,
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['ERC4626_vaultU2_Ethereum']);
  t.is(balances.ERC4626_vaultU2_Ethereum!.value, 3000n);
});
