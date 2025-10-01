/** @file test for deposit tools */
/* eslint-disable max-classes-per-file, class-methods-use-this */
import test from 'ava';

import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import { Far } from '@endo/pass-style';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/test/network/test-network.js';
import { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import {
  handleDeposit,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import { SpectrumClient } from '../src/spectrum-client.ts';
import { mockGasEstimator } from './mocks.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const makeDeposit = value => AmountMath.make(depositBrand, value);

const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;

const powers = { fetch, setTimeout };

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
      if (chainName === 'noble' && denom === 'usdn') {
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

  t.deepEqual(result, { policyVersion: 4, rebalanceCount: 0, steps: [] });
});

test('handleDeposit handles different position types correctly', async t => {
  const deposit = makeDeposit(1000n);
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
          Avalanche: 'avalanche:test:addr2',
          Ethereum: 'ethereum:test:addr3',
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
          balance: { supplyBalance: 150, borrowAmount: 0 },
        };
      }
      if (chain === 'ethereum' && pool === 'compound') {
        return {
          pool,
          chain,
          address: addr,
          balance: { supplyBalance: 75, borrowAmount: 0 },
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
      if (chainName === 'noble' && denom === 'usdn') {
        return { denom, amount: '300' };
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
  t.snapshot(result?.steps);
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
  const steps = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.deepEqual(steps, []);
});

test('planRebalanceToAllocations moves funds when needed', async t => {
  const targetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const currentBalances = { USDN: makeDeposit(1000n) };
  const steps = await planRebalanceToAllocations({
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(steps);
});

test('planWithdrawFromAllocations withdraws and rebalances', async t => {
  const targetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };
  const currentBalances = { USDN: makeDeposit(2000n) };
  const steps = await planWithdrawFromAllocations({
    amount: makeDeposit(1000n),
    brand: depositBrand,
    currentBalances,
    targetAllocation,
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(steps);
});

test('planWithdrawFromAllocations with no target preserves relative amounts', async t => {
  const currentBalances = {
    USDN: makeDeposit(800n),
    Aave_Arbitrum: makeDeposit(800n),
    Compound_Arbitrum: makeDeposit(400n),
  };
  const steps = await planWithdrawFromAllocations({
    amount: makeDeposit(1000n),
    brand: depositBrand,
    currentBalances,
    targetAllocation: {},
    network: TEST_NETWORK,
    feeBrand,
    gasEstimator: mockGasEstimator,
  });
  t.snapshot(steps);
});
