/** @file test for deposit tools */
/* eslint-disable max-classes-per-file, class-methods-use-this */
import test from 'ava';

import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import { Far } from '@endo/pass-style';
import { planDepositTransfers } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { handleDeposit } from '../src/plan-deposit.ts';
import { SpectrumClient } from '../src/spectrum-client.ts';

const brand = Far('mock brand') as Brand<'nat'>;
const feeBrand = Far('mock fee brand') as Brand<'nat'>;

const powers = { fetch, setTimeout };

// Mock fee values for testing (minimum 20 BLD = 20_000_000 ubld)
const mockFees = {
  feeBrand,
  feeAccount: AmountMath.make(feeBrand, 20_000_000n),
  feeCall: AmountMath.make(feeBrand, 20_000_000n),
};

test('planDepositTransfers works in a handful of cases', t => {
  const make = value => AmountMath.make(brand, value);

  // Test case 1: Empty current balances, equal target allocation
  const deposit1 = make(1000n);
  const currentBalances1 = {};
  const targetAllocation1: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };

  const result1 = planDepositTransfers(
    deposit1,
    currentBalances1,
    targetAllocation1,
  );

  t.deepEqual(result1, {
    USDN: make(500n),
    Aave_Arbitrum: make(300n),
    Compound_Arbitrum: make(200n),
  });

  // Test case 2: Existing balances, need rebalancing
  const deposit2 = make(500n);
  const currentBalances2 = {
    USDN: make(200n),
    Aave_Arbitrum: make(100n),
    Compound_Arbitrum: make(0n),
  };
  const targetAllocation2: TargetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };

  const result2 = planDepositTransfers(
    deposit2,
    currentBalances2,
    targetAllocation2,
  );

  // Total after deposit: 300 + 500 = 800
  // Targets: USDN=320, Aave=320, Compound=160
  // Transfers needed: USDN=120, Aave=220, Compound=160
  t.deepEqual(result2, {
    USDN: make(120n),
    Aave_Arbitrum: make(220n),
    Compound_Arbitrum: make(160n),
  });

  // Test case 3: Some positions already over-allocated
  const deposit3 = make(300n);
  const currentBalances3 = {
    USDN: make(600n), // already over target
    Aave_Arbitrum: make(100n),
    Compound_Arbitrum: make(50n),
  };
  const targetAllocation3: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };

  const result3 = planDepositTransfers(
    deposit3,
    currentBalances3,
    targetAllocation3,
  );

  // Total after deposit: 750 + 300 = 1050
  // Targets: USDN=525, Aave=315, Compound=210
  // USDN is already over target (600 > 525), so no transfer
  // Need transfers: Aave=215, Compound=160, total=375
  // But deposit is only 300, so scale down proportionally:
  // Aave: 215 * (300/375) = 172, Compound: 160 * (300/375) = 128
  t.deepEqual(result3, {
    Aave_Arbitrum: make(172n),
    Compound_Arbitrum: make(128n),
  });

  // Test case 4: Transfer amounts exceed deposit (scaling needed)
  const deposit4 = make(100n);
  const currentBalances4 = {
    USDN: make(0n),
    Aave_Arbitrum: make(0n),
    Compound_Arbitrum: make(0n),
  };
  const targetAllocation4: TargetAllocation = {
    USDN: 60n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 10n,
  };

  const result4 = planDepositTransfers(
    deposit4,
    currentBalances4,
    targetAllocation4,
  );

  // Should allocate proportionally to the 100 deposit
  t.deepEqual(result4, {
    USDN: make(60n),
    Aave_Arbitrum: make(30n),
    Compound_Arbitrum: make(10n),
  });

  // Test case 5: Single position target
  const deposit5 = make(1000n);
  const currentBalances5 = { USDN: make(500n) };
  const targetAllocation5: TargetAllocation = { USDN: 100n };

  const result5 = planDepositTransfers(
    deposit5,
    currentBalances5,
    targetAllocation5,
  );

  // Total after: 1500, target: 1500, current: 500, transfer: 1000
  t.deepEqual(result5, {
    USDN: make(1000n),
  });
});

test('handleDeposit works with mocked dependencies', async t => {
  const make = value => AmountMath.make(brand, value);
  const deposit = make(1000n);
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

  const steps = await handleDeposit(
    deposit,
    portfolioKey,
    mockVstorageKit.readPublished,
    mockSpectrumClient,
    mockCosmosRestClient,
    mockFees,
  );
  t.snapshot(steps);
});

test('handleDeposit handles missing targetAllocation gracefully', async t => {
  const make = value => AmountMath.make(brand, value);
  const deposit = make(1000n);
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

  const result = await handleDeposit(
    deposit,
    portfolioKey,
    mockVstorageKit.readPublished,
    mockSpectrumClient,
    mockCosmosRestClient,
    mockFees,
  );

  t.is(result, undefined);
});

test('handleDeposit handles different position types correctly', async t => {
  const make = value => AmountMath.make(brand, value);
  const deposit = make(1000n);
  const portfolioKey = 'test.portfolios.portfolio1' as const;

  // Mock VstorageKit readPublished with various position types
  const mockReadPublished = async (path: string) => {
    if (path === portfolioKey) {
      return {
        positionKeys: [
          'USDN',
          'USDNVault',
          'Aave_Avalanche',
          'Compound_Polygon',
        ],
        flowCount: 0,
        accountIdByChain: {
          noble: 'noble:test:addr1',
          Avalanche: 'avalanche:test:addr2',
          Polygon: 'polygon:test:addr3',
        },
        targetAllocation: {
          USDN: 40n,
          USDNVault: 20n,
          Aave_Avalanche: 25n,
          Compound_Polygon: 15n,
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
      if (chain === 'polygon' && pool === 'compound') {
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

  const steps = await handleDeposit(
    deposit,
    portfolioKey,
    mockVstorageKit.readPublished,
    mockSpectrumClient,
    mockCosmosRestClient,
    mockFees,
  );
  t.snapshot(steps);
});
