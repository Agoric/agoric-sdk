/** @file test for deposit tools */
/* eslint-disable max-classes-per-file, class-methods-use-this */
import test from 'ava';

import { ACCOUNT_DUST_EPSILON } from '@agoric/portfolio-api';
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
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { Far } from '@endo/pass-style';
import { CosmosRestClient, USDN } from '../src/cosmos-rest-client.ts';
import {
  getCurrentBalances,
  getNonDustBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import type { PlannerContext } from '../src/plan-deposit.ts';
import { SpectrumClient } from '../src/spectrum-client.ts';
import { mockGasEstimator } from './mocks.ts';

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

const powers = { fetch, setTimeout };

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
  });

  t.deepEqual(Object.keys(balances), ['USDN']);
  t.is(balances.USDN!.value, 101n);
});

test('handleDeposit works with mocked dependencies', async t => {
  const portfolioKey = 'test.portfolios.portfolio1' as const;
  const targetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };
  const initialBalances = {
    USDN: 200_000n,
    Aave_Arbitrum: 100_000n,
    Compound_Arbitrum: 50_000n,
  };
  const deposit = makeDeposit(9_650_000n);

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
        targetAllocation,
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

    async getPoolBalance(chain: any, pool: any, address: any) {
      let balance = 0;
      if (pool === 'aave' && chain === 'arbitrum') {
        balance = 100_000;
        balance = Number(initialBalances.Aave_Arbitrum);
      }
      if (pool === 'compound' && chain === 'arbitrum') {
        balance = Number(initialBalances.Compound_Arbitrum);
      }
      let balanceObj = { supplyBalance: balance, borrowAmount: 0 };
      return { pool, chain, address, balance: balanceObj };
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
        return { denom, amount: `${initialBalances.USDN}` };
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
  arrayIsLike(t, result.plan.flow, [
    makeMovementDesc('<Deposit>', '@agoric', deposit.value),
    makeMovementDesc('@agoric', '@noble', deposit.value),
    makeMovementDesc('@noble', 'USDN', 5_000_000n - initialBalances.USDN),
    makeMovementDesc(
      '@noble',
      '@Arbitrum',
      5_000_000n -
        initialBalances.Aave_Arbitrum -
        initialBalances.Compound_Arbitrum,
    ),
    makeMovementDesc(
      '@Arbitrum',
      'Aave_Arbitrum',
      3_000_000n - initialBalances.Aave_Arbitrum,
    ),
    makeMovementDesc(
      '@Arbitrum',
      'Compound_Arbitrum',
      2_000_000n - initialBalances.Compound_Arbitrum,
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
  t.snapshot(plan);
});

test('planWithdrawFromAllocations withdraws and rebalances', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 40n, Aave_Arbitrum: 40n, Compound_Arbitrum: 20n },
    currentBalances: { USDN: makeDeposit(2000n) },
    amount: makeDeposit(1000n),
  });
  t.snapshot(plan);
});

test('planWithdrawFromAllocations can withdraw to an EVM account', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 40n, Aave_Arbitrum: 40n, Compound_Arbitrum: 20n },
    currentBalances: { USDN: makeDeposit(2000n) },
    amount: makeDeposit(1000n),
    toChain: 'Ethereum',
  });
  t.snapshot(plan);
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
  t.snapshot(plan);
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
  t.snapshot(plan);
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
  t.snapshot(plan);
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
    // TODO: Refactor this test against a stable network dedicated to testing.
    network: PROD_NETWORK,
  });
  return plan;
}

test('planRebalanceToAllocations regression - single source, 2x', async t => {
  // TODO: For human comprehensibility, adopt something like `readableSteps`
  // from packages/portfolio-contract/test/rebalance.test.ts.
  const plan = await singleSourceRebalanceSteps(2);
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
    ...plannerContext,
    currentBalances,
    targetAllocation,
    // TODO: Refactor this test against a stable network dedicated to testing.
    network: PROD_NETWORK,
  });
  t.snapshot(plan);
});
