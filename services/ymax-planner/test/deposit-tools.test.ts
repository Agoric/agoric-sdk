/** @file test for deposit tools */
import test from 'ava';
import type { Assertions } from 'ava';

import type { PartialDeep } from 'type-fest';

import {
  ACCOUNT_DUST_EPSILON,
  CaipChainIds,
  SupportedChain,
  type AssetPlaceRef,
  type InterChainAccountRef,
  type MovementDesc,
  type StatusFor,
} from '@agoric/portfolio-api';
import type {
  PortfolioPublishedPathTypes,
  TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import {
  readableSteps,
  readableOrder,
} from '@aglocal/portfolio-contract/test/supports.js';
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
import { fromTypedEntries, objectMap } from '@agoric/internal';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { q, Fail } from '@endo/errors';
import { Far } from '@endo/pass-style';
import PROD_NETWORK from '@aglocal/portfolio-contract/tools/network/prod-network.ts';
import type { EvmAddress } from '@agoric/fast-usdc';
import { assetList as nobleAssetList } from 'chain-registry/mainnet/noble/index.js';
import {
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
  createMockProviderSets,
} from './mocks.ts';
import type { Sdk as SpectrumBlockchainSdk } from '../src/graphql/api-spectrum-blockchain/__generated/sdk.ts';
import PROD_NETWORK_202604 from '../tools/network-snapshots/prod-network-2026-04.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const makeDeposit = value => AmountMath.make(depositBrand, value);

const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

const plannerContext: Omit<
  PlannerContext<AssetPlaceRef, keyof TargetAllocation>,
  'currentBalances' | 'targetAllocation'
> = {
  brand: depositBrand,
  network: TEST_NETWORK,
  feeBrand,
  gasEstimator: mockGasEstimator,
};

const noMinChainRecords = plannerContext.network.chains.map(chain => ({
  ...chain,
  deltaSoftMin: 0n,
}));

const emptyPlan = harden({ flow: [], order: undefined });

const makeMovementDesc = (
  src: AssetPlaceRef,
  dest: AssetPlaceRef,
  value: bigint,
) => {
  return { src, dest, amount: { value } };
};

/** A helper to support prettier-friendly plan flow assertions. */
const assertPlanFlow = (
  t: Assertions,
  label: string,
  flow: MovementDesc[],
  expectedFlow: PartialDeep<MovementDesc>[],
) => {
  arrayIsLike(t, flow, expectedFlow, label);
};

/**
 * Helper for test results
 */
const handleDeposit = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  amount: NatAmount,
  feeTokenBrand: Brand<'nat'>,
  powers: {
    readPublished: VstorageKit<PortfolioPublishedPathTypes>['readPublished'];
    gasEstimator: GasEstimator;
    spectrumBlockchain?: SpectrumBlockchainSdk;
    spectrumChainIds?: Partial<Record<SupportedChain, string>>;
    evmTokenAddresses?: Partial<
      Record<InterChainAccountRef | PoolKey, EvmAddress>
    >;
    usdcTokensByChain?: Partial<Record<SupportedChain, string>>;
    balances?: Record<EvmAddress, bigint>;
  },
  network: NetworkSpec = TEST_NETWORK,
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { policyVersion, rebalanceCount, targetAllocation } = status;
  if (!targetAllocation) {
    return { policyVersion, rebalanceCount, plan: emptyPlan };
  }
  const currentBalances = await getNonDustBalances(status, amount.brand, {
    spectrumChainIds: powers.spectrumChainIds || {},
    usdcTokensByChain: powers.usdcTokensByChain || {},
    evmTokenAddresses: powers.evmTokenAddresses || {},
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: createMockProviderSets({
      balances: powers.balances || {},
    }).evmProviders,
    ...powers,
  });
  const plan = await planDepositToAllocations({
    amount,
    brand: amount.brand,
    currentBalances,
    targetAllocation,
    network,
    feeBrand: feeTokenBrand,
    gasEstimator: powers.gasEstimator,
  });
  return { policyVersion, rebalanceCount, plan };
};

{
  const usdn =
    nobleAssetList.assets.find(a => a.symbol === 'USDN') || Fail`no USDN`;
  usdn.base === 'uusdn' ||
    Fail`precondition: USDN denom must be "uusdn", not ${q(usdn.base)}`;
}

test('getNonDustBalances filters balances at or below the dust epsilon', async t => {
  const status = {
    positionKeys: ['Aave_Arbitrum', 'Compound_Base'],
    accountIdByChain: {
      Arbitrum: 'eip155:42161:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      Base: 'eip155:8453:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
  } as any;

  const compoundBaseAddress =
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5832' as EvmAddress;
  const compoundBaseBalance = 150n;
  const balances = await getNonDustBalances(status, depositBrand, {
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    spectrumChainIds: {},
    usdcTokensByChain: {},
    evmTokenAddresses: {
      Aave_Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as EvmAddress,
      Compound_Base: compoundBaseAddress,
      '@Arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as EvmAddress,
      '@Base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as EvmAddress,
    },
    chainNameToChainIdMap: CaipChainIds.mainnet,
    evmProviders: createMockProviderSets({
      balances: {
        [compoundBaseAddress]: compoundBaseBalance,
      },
    }).evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['Compound_Base']);
  t.false(Object.hasOwn(balances, 'Aave_Arbitrum'));
  t.is(balances.Compound_Base!.value, compoundBaseBalance);
});

test('getNonDustBalances retains noble balances above the dust epsilon', async t => {
  const status = {
    positionKeys: ['USDN'],
    accountIdByChain: {
      noble: 'chain:mock:addr-noble',
    },
  } as any;

  const balances = await getNonDustBalances(status, depositBrand, {
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 101 }),
    spectrumChainIds: { noble: 'noble-1' },
    usdcTokensByChain: { noble: 'uusdc' },
    evmTokenAddresses: {},
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: mockEvmCtx.evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['USDN']);
  t.is(balances.USDN!.value, 101_000_000n);
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

  const erc4626Address =
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB49' as EvmAddress;
  const erc4626Balance = 3000n;
  const balances = await getNonDustBalances(status, depositBrand, {
    spectrumChainIds: {
      agoric: 'agoricdev-25',
      noble: 'grand-1',
    },
    evmTokenAddresses: {
      ERC4626_vaultU2_Ethereum: erc4626Address,
      '@Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as EvmAddress,
    },
    spectrumBlockchain: createMockSpectrumBlockchain({}),
    usdcTokensByChain: {
      agoric: 'uusdc',
      noble: 'uusdc',
    },
    chainNameToChainIdMap: CaipChainIds.testnet,
    evmProviders: createMockProviderSets({
      balances: {
        [erc4626Address]: erc4626Balance,
      },
    }).evmProviders,
  });

  t.deepEqual(Object.keys(balances), ['ERC4626_vaultU2_Ethereum']);
  t.is(balances.ERC4626_vaultU2_Ethereum!.value, erc4626Balance);
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

  const aaveArbitrumAddress =
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5833' as EvmAddress;
  const compoundArbitrumAddress =
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5834' as EvmAddress;

  const result = await handleDeposit(portfolioKey, deposit, feeBrand, {
    readPublished: mockVstorageKit.readPublished,
    spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.2 }),
    spectrumChainIds: {
      noble: 'noble-1',
    },
    evmTokenAddresses: {
      Aave_Arbitrum: aaveArbitrumAddress,
      Compound_Arbitrum: compoundArbitrumAddress,
      '@Arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as EvmAddress,
    },
    usdcTokensByChain: {
      noble: 'uusdc',
    },
    gasEstimator: mockGasEstimator,
    balances: {
      [aaveArbitrumAddress]: initialBalances.Aave_Arbitrum,
      [compoundArbitrumAddress]: initialBalances.Compound_Arbitrum,
    },
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

  const aaveAvalancheAddress =
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5833' as EvmAddress;
  const compoundEthereumAddress =
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5834' as EvmAddress;
  const result = await handleDeposit(
    portfolioKey,
    deposit,
    feeBrand,
    {
      readPublished: mockVstorageKit.readPublished,
      spectrumBlockchain: createMockSpectrumBlockchain({ usdn: 0.3 }),
      spectrumChainIds: {
        noble: 'noble-1',
      },
      evmTokenAddresses: {
        Aave_Avalanche: aaveAvalancheAddress,
        Compound_Ethereum: compoundEthereumAddress,
        '@Avalanche':
          '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as EvmAddress,
        '@Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as EvmAddress,
      },
      usdcTokensByChain: {
        noble: 'uusdc',
      },
      gasEstimator: mockGasEstimator,
      balances: {
        [aaveAvalancheAddress]: 150_000n,
        [compoundEthereumAddress]: 75_000n,
      },
    },
    harden({ ...plannerContext.network, chains: noMinChainRecords }),
  );
  const plan = result?.plan;
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('targetAllocation must have positive total weight', async t => {
  const badContext = {
    ...plannerContext,
    targetAllocation: { Aave_Arbitrum: 0n, Compound_Arbitrum: 0n },
    currentBalances: {},
  };
  const expectation = {
    message: 'Total target allocation weights must be positive.',
  };
  const amount = makeDeposit(scale6(1));
  await t.throwsAsync(
    planRebalanceToAllocations(badContext),
    expectation,
    'planRebalanceToAllocations',
  );
  await t.throwsAsync(
    planDepositToAllocations({ ...badContext, amount }),
    expectation,
    'planDepositToAllocations',
  );
  await t.throwsAsync(
    planWithdrawFromAllocations({
      ...badContext,
      currentBalances: { Aave_Arbitrum: amount, Compound_Arbitrum: amount },
      amount,
    }),
    expectation,
    'planWithdrawFromAllocations',
  );
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
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
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
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
    targetAllocation: { USDN: 40n, Aave_Arbitrum: 40n, Compound_Arbitrum: 20n },
    currentBalances: { USDN: makeDeposit(2000n) },
    amount: makeDeposit(1000n),
  });
  t.snapshot(plan && readableSteps(plan.flow, depositBrand), 'steps');
  t.snapshot(plan?.order && readableOrder(plan.order), 'step dependencies');
  t.snapshot(plan, 'raw plan');
});

test('planWithdrawFromAllocations rejects overdrafts', async t => {
  await t.throwsAsync(
    planWithdrawFromAllocations({
      ...plannerContext,
      targetAllocation: { USDN: 100n },
      currentBalances: { USDN: makeDeposit(2000n) },
      amount: makeDeposit(3000n),
    }),
    { message: 'Insufficient funds for withdrawal.' },
  );
});

test('planWithdrawFromAllocations can withdraw to an EVM account', async t => {
  const plan = await planWithdrawFromAllocations({
    ...plannerContext,
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
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
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
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
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
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
    network: harden({ ...plannerContext.network, chains: noMinChainRecords }),
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
  const amount = makeDeposit(1_000_000n);
  const plan = await planDepositToAllocations({
    ...plannerContext,
    targetAllocation: { USDN: 1n },
    currentBalances: {},
    amount,
  });

  const expectedFlow = [
    { amount, src: '<Deposit>', dest: '@agoric' },
    { amount, src: '@agoric', dest: '@noble' },
    { amount, src: '@noble', dest: 'USDN', detail: { usdnOut: 999499n } },
  ];
  arrayIsLike(t, plan?.flow, expectedFlow);
  t.deepEqual(plan, { flow: expectedFlow, order: undefined });
});

test('planDepositToAllocations can deposit from an EVM account', async t => {
  const amount = makeDeposit(1_000_000n);
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

test('solver regressions', async t => {
  // PoolKey names have been changed to align with TEST_NETWORK, but the numbers
  // all match.

  // 2026-04-13T18:50Z
  const portfolio90Flow9 = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: {
      Aave_Avalanche: 0n,
      Aave_Base: 0n,
      Compound_Arbitrum: 0n,
      Compound_Base: 0n,
      Aave_Ethereum: 50n,
      Aave_Optimism: 0n,
      Compound_Ethereum: 50n,
    },
    currentBalances: {
      Aave_Ethereum: makeDeposit(108976524n),
      Compound_Ethereum: makeDeposit(114585044n),
    },
    amount: makeDeposit(223560027n),
  });
  assertPlanFlow(t, 'portfolio90 flow9', portfolio90Flow9.flow, [
    makeMovementDesc('Aave_Ethereum', '@Ethereum', 108975753n),
    makeMovementDesc('Compound_Ethereum', '@Ethereum', 114584274n),
    makeMovementDesc('@Ethereum', '@agoric', 223560027n),
    makeMovementDesc('@agoric', '<Cash>', 223560027n),
  ]);

  // flow2: 2026-04-20T17:02Z
  // flow3: 2026-04-20T17:03Z
  // flow4: 2026-04-20T17:03Z
  // flow8: 2026-04-22T09:33Z
  const portfolio176FlowX = await planWithdrawFromAllocations({
    ...plannerContext,
    targetAllocation: { Aave_Base: 100n },
    currentBalances: { Aave_Base: makeDeposit(999999n) },
    amount: makeDeposit(999999n),
    toChain: 'Avalanche',
  });
  assertPlanFlow(t, 'portfolio176 flow{2,3,4,8}', portfolio176FlowX.flow, [
    makeMovementDesc('Aave_Base', '@Base', 999999n),
    makeMovementDesc('@Base', '@Avalanche', 999999n),
    makeMovementDesc('@Avalanche', '-Avalanche', 999999n),
  ]);

  // 2026-04-21T16:31Z
  const portfolio81Flow23 = await planDepositToAllocations({
    ...plannerContext,
    targetAllocation: {
      Aave_Ethereum: 50n,
      Compound_Ethereum: 50n,
    },
    currentBalances: {
      Aave_Ethereum: makeDeposit(8123339354n),
      Compound_Ethereum: makeDeposit(8123318568n),
    },
    amount: makeDeposit(1000000000n),
    fromChain: 'Ethereum',
  });
  assertPlanFlow(t, 'portfolio81 flow23', portfolio81Flow23.flow, [
    makeMovementDesc('+Ethereum', '@Ethereum', 1000000000n),
    makeMovementDesc('@Ethereum', 'Aave_Ethereum', 499989607n),
    makeMovementDesc('@Ethereum', 'Compound_Ethereum', 500010393n),
  ]);

  // 2026-04-21T23:52Z
  const portfolio177Flow1 = await planDepositToAllocations({
    ...plannerContext,
    targetAllocation: {
      Aave_Ethereum: 34n,
      Compound_Ethereum: 33n,
      Aave_Base: 33n,
    },
    currentBalances: {},
    amount: makeDeposit(scale6(25_000)),
    fromChain: 'Ethereum',
  });
  assertPlanFlow(t, 'portfolio177 flow1', portfolio177Flow1.flow, [
    makeMovementDesc('+Ethereum', '@Ethereum', scale6(25_000)),
    makeMovementDesc('@Ethereum', 'Aave_Ethereum', scale6(8500)),
    makeMovementDesc('@Ethereum', 'Compound_Ethereum', scale6(8250)),
    makeMovementDesc('@Ethereum', '@agoric', scale6(8250)),
    makeMovementDesc('@agoric', '@noble', scale6(8250)),
    makeMovementDesc('@noble', '@Base', scale6(8250)),
    makeMovementDesc('@Base', 'Aave_Base', scale6(8250)),
  ]);

  // 2026-04-28T10:09Z
  const ymax0Portfolio35Flow76 = await planRebalanceToAllocations({
    ...plannerContext,
    network: PROD_NETWORK_202604,
    targetAllocation: {
      '@Arbitrum': 0n,
      '@Avalanche': 0n,
      '@Ethereum': 0n,
      Aave_Arbitrum: 0n,
      Aave_Avalanche: 100n,
      ERC4626_morphoClearstarHighYieldUsdc_Ethereum: 0n,
    },
    currentBalances: { '@Avalanche': makeDeposit(3900011n) },
  });
  assertPlanFlow(t, 'ymax0 portfolio35 flow76', ymax0Portfolio35Flow76.flow, [
    makeMovementDesc('@Avalanche', 'Aave_Avalanche', 3900011n),
  ]);
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

test('@<ChainName> USDC target allocations', async t => {
  const currentBalances = {
    '@Base': makeDeposit(scale6(10)),
    Aave_Base: makeDeposit(scale6(10)),
  };

  const withdrawPlan = await planWithdrawFromAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation: objectMap(currentBalances, amt => amt.value),
    amount: makeDeposit(scale6(10)),
  });
  assertPlanFlow(t, 'withdraw from mixed targets', withdrawPlan.flow, [
    makeMovementDesc('Aave_Base', '@Base', scale6(5)),
    makeMovementDesc('@Base', '@agoric', scale6(10)),
    makeMovementDesc('@agoric', '<Cash>', scale6(10)),
  ]);

  const depositPlan = await planDepositToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation: objectMap(currentBalances, amt => amt.value),
    amount: makeDeposit(scale6(10)),
  });
  assertPlanFlow(t, 'deposit to mixed targets', depositPlan.flow, [
    makeMovementDesc('<Deposit>', '@agoric', scale6(10)),
    makeMovementDesc('@agoric', '@noble', scale6(10)),
    makeMovementDesc('@noble', '@Base', scale6(10)),
    makeMovementDesc('@Base', 'Aave_Base', scale6(5)),
  ]);

  const depositAndRebalancePlan = await planDepositToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation: { '@Base': 100n },
    amount: makeDeposit(scale6(10)),
  });
  assertPlanFlow(t, 'deposit and consolidate', depositAndRebalancePlan.flow, [
    makeMovementDesc('Aave_Base', '@Base', scale6(10)),
    makeMovementDesc('<Deposit>', '@agoric', scale6(10)),
    makeMovementDesc('@agoric', '@noble', scale6(10)),
    makeMovementDesc('@noble', '@Base', scale6(10)),
  ]);

  const rebalancePlan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation: { '@Base': 100n },
  });
  assertPlanFlow(t, 'rebalance into chain', rebalancePlan.flow, [
    makeMovementDesc('Aave_Base', '@Base', scale6(10)),
  ]);

  const rerebalancePlan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation: { '@Base': 50n, '@Optimism': 50n },
  });
  assertPlanFlow(t, 'rebalance into chains', rerebalancePlan.flow, [
    makeMovementDesc('Aave_Base', '@Base', scale6(10)),
    makeMovementDesc('@Base', '@agoric', scale6(10)),
    makeMovementDesc('@agoric', '@noble', scale6(10)),
    makeMovementDesc('@noble', '@Optimism', scale6(10)),
  ]);
});

// TODO(AGO-459): These tests cover the proportional reallocation of AGO-373,
// but AGO-459 requests different behavior (holding undeployable funds on their
// source chain) and we're avoiding too much churn by ensuring that they only
// get released atomically.
{
  // Create scenarios where a 10 USDC minimum delta for Ethereum and the default
  // of 1 USDC elsewhere suppress changes until balances are scaled up.
  const chainRecords = plannerContext.network.chains.map(chain =>
    chain.name === 'Ethereum'
      ? { ...chain, deltaSoftMin: 100_000_000n }
      : chain,
  );
  const expensiveEthNetwork = harden({
    ...plannerContext.network,
    chains: chainRecords,
  });
  const targetAllocation = {
    Aave_Ethereum: 880n,
    Aave_Base: 50n,
    Aave_Optimism: 50n,
    Aave_Avalanche: 20n,
    Beefy_re7_Avalanche: 0n,
  };
  const balancesTemplate = {
    Aave_Ethereum: 12.5,
    Aave_Base: 4.01,
    Aave_Optimism: 5.99,
    Aave_Avalanche: 2.6,
    Beefy_re7_Avalanche: 0.008,
  } satisfies Partial<Record<AssetPlaceRef, number>>;
  const makeBalances = (scale: number) =>
    objectMap(balancesTemplate, v => makeDeposit(scale6(v * scale)));

  test.failing(
    'planRebalanceToAllocations suppresses small deltas',
    async t => {
      const plan = await planRebalanceToAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: makeBalances(1),
      });

      // All deltas are too small.
      arrayIsLike(t, plan?.flow, []);
    },
  );

  test.failing('planDepositToAllocations suppresses small deltas', async t => {
    const amount = makeDeposit(scale6(0.9));
    const plan = await planDepositToAllocations({
      ...plannerContext,
      network: expensiveEthNetwork,
      targetAllocation,
      currentBalances: objectMap(makeBalances(1), (amt, place) =>
        place === 'Aave_Avalanche' ? AmountMath.subtract(amt, amount) : amt,
      ),
      amount,
    });

    // All deltas are too small.
    arrayIsLike(t, plan?.flow, []);
  });

  test.failing(
    'planRebalanceToAllocations suppresses small deltas, 10x',
    async t => {
      const plan = await planRebalanceToAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: makeBalances(10),
      });

      // Deltas for the largest and smallest weights are too small, but relative
      // adjustment between Aave_{Avalanche,Optimism,Base} can succeed,
      // distibuting $26 + $59.90 + $40.10 = $126 over respective weights
      // [20, 50, 50] to [$21, $52.50, $52.50].
      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        makeMovementDesc('Aave_Avalanche', '@Avalanche', scale6(5)),
        makeMovementDesc('@Avalanche', '@agoric', scale6(5)),
        makeMovementDesc('Aave_Optimism', '@Optimism', scale6(7.4)),
        makeMovementDesc('@Optimism', '@agoric', scale6(7.4)),
        makeMovementDesc('@agoric', '@noble', scale6(12.4)),
        makeMovementDesc('@noble', '@Base', scale6(12.4)),
        makeMovementDesc('@Base', 'Aave_Base', scale6(12.4)),
      ]);
    },
  );

  test.failing(
    'planDepositToAllocations suppresses small deltas, 10x',
    async t => {
      const amount = makeDeposit(scale6(9));
      const plan = await planDepositToAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: objectMap(makeBalances(10), (amt, place) =>
          place === 'Aave_Avalanche' ? AmountMath.subtract(amt, amount) : amt,
        ),
        amount,
      });

      // Deltas for the largest and smallest weights are too small, but relative
      // adjustment between <Deposit> and Aave_{Avalanche,Optimism,Base} can
      // succeed, distibuting $9 + $17 + $59.90 + $40.10 = $126 over respective
      // weights [0, 20, 50, 50] to [$0, $21, $52.50, $52.50].
      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        makeMovementDesc('Aave_Optimism', '@Optimism', scale6(7.4)),
        makeMovementDesc('@Optimism', '@agoric', scale6(7.4)),
        makeMovementDesc('<Deposit>', '@agoric', scale6(9)),
        makeMovementDesc('@agoric', '@noble', scale6(16.4)),
        makeMovementDesc('@noble', '@Avalanche', scale6(4)),
        makeMovementDesc('@noble', '@Base', scale6(12.4)),
        makeMovementDesc('@Avalanche', 'Aave_Avalanche', scale6(4)),
        makeMovementDesc('@Base', 'Aave_Base', scale6(12.4)),
      ]);
    },
  );

  test.failing(
    'planRebalanceToAllocations suppresses small deltas, 100x',
    async t => {
      const plan = await planRebalanceToAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: makeBalances(100),
      });

      // The lowest-weight delta is too small, but values at
      // Aave_{Avalanche,Base,Optimism,Ethereum} of $260 + $401 + $599 + $1250 =
      // $2510 can be distributed over respective weights [20, 50, 50, 880] to
      // [$50.20, $125.50, $125.50, $2208.80].
      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        makeMovementDesc('Aave_Avalanche', '@Avalanche', scale6(209.8)),
        makeMovementDesc('Aave_Base', '@Base', scale6(275.5)),
        makeMovementDesc('@Base', '@Avalanche', scale6(275.5)),
        makeMovementDesc('Aave_Optimism', '@Optimism', scale6(473.5)),
        makeMovementDesc('@Optimism', '@agoric', scale6(473.5)),
        makeMovementDesc('@Avalanche', '@agoric', scale6(485.3)),
        makeMovementDesc('@agoric', '@noble', scale6(958.8)),
        makeMovementDesc('@noble', '@Ethereum', scale6(958.8)),
        makeMovementDesc('@Ethereum', 'Aave_Ethereum', scale6(958.8)),
      ]);
    },
  );

  test.failing(
    'planDepositToAllocations suppresses small deltas, 100x',
    async t => {
      const amount = makeDeposit(scale6(90));
      const plan = await planDepositToAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: objectMap(makeBalances(100), (amt, place) =>
          place === 'Aave_Avalanche' ? AmountMath.subtract(amt, amount) : amt,
        ),
        amount,
      });

      // Deltas for the largest and smallest weights are too small, but relative
      // adjustment between <Deposit> and Aave_{Avalanche,Optimism,Base} can
      // succeed, distibuting $9 + $17 + $59.90 + $40.10 = $126 over respective
      // weights [0, 20, 50, 50] to [$0, $21, $52.50, $52.50].
      // t.log(readableSteps(plan.flow, depositBrand));
      // The lowest-weight delta is too small, but values at
      // <Deposit> and Aave_{Avalanche,Base,Optimism,Ethereum} of
      // $90 + $170 + $401 + $599 + $1250 = $2510 can be distributed over
      // respective weights [0, 20, 50, 50, 880] to
      // [$0, $50.20, $125.50, $125.50, $2208.80].
      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        makeMovementDesc('Aave_Avalanche', '@Avalanche', scale6(119.8)),
        makeMovementDesc('@Avalanche', '@agoric', scale6(119.8)),
        makeMovementDesc('Aave_Base', '@Base', scale6(275.5)),
        makeMovementDesc('@Base', '@agoric', scale6(275.5)),
        makeMovementDesc('Aave_Optimism', '@Optimism', scale6(473.5)),
        makeMovementDesc('@Optimism', '@agoric', scale6(473.5)),
        makeMovementDesc('<Deposit>', '@agoric', scale6(90)),
        makeMovementDesc('@agoric', '@noble', scale6(958.8)),
        makeMovementDesc('@noble', '@Ethereum', scale6(958.8)),
        makeMovementDesc('@Ethereum', 'Aave_Ethereum', scale6(958.8)),
      ]);
    },
  );

  test.failing(
    'planWithdrawFromAllocations works despite small deltas (amount >= deltaSoftMin)',
    async t => {
      const amount = makeDeposit(scale6(1));
      const plan = await planWithdrawFromAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: objectMap(makeBalances(1), (amt, place) =>
          place === 'Aave_Ethereum' ? AmountMath.add(amt, amount) : amt,
        ),
        amount,
      });

      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        { amount, src: 'Aave_Optimism', dest: '@Optimism' },
        { amount, src: '@Optimism', dest: '@agoric' },
        { amount, src: '@agoric', dest: '<Cash>' },
      ]);
    },
  );

  test.failing(
    'planWithdrawFromAllocations works despite small deltas (amount < deltaSoftMin)',
    async t => {
      const amount = makeDeposit(scale6(0.9));
      const plan = await planWithdrawFromAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: objectMap(makeBalances(1), (amt, place) =>
          place === 'Aave_Ethereum' ? AmountMath.add(amt, amount) : amt,
        ),
        amount,
      });

      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        { amount, src: 'Aave_Ethereum', dest: '@Ethereum' },
        { amount, src: '@Ethereum', dest: '@agoric' },
        { amount, src: '@agoric', dest: '<Cash>' },
      ]);
    },
  );

  test.failing(
    'planWithdrawFromAllocations works despite small deltas (amount > first currentBalances entry)',
    async t => {
      const plan = await planWithdrawFromAllocations({
        ...plannerContext,
        network: expensiveEthNetwork,
        targetAllocation,
        currentBalances: fromTypedEntries(
          Object.keys(balancesTemplate)
            .reverse()
            .map((place: AssetPlaceRef, idx: number) => [
              place,
              makeDeposit(scale6(idx * 0.1)),
            ]),
        ),
        amount: makeDeposit(scale6(0.8)),
      });

      // All deltas are too small, so the $0.80 withdrawal is pulled from
      // descending balances (Aave_{Ethereum,Base,Optimism} at
      // [$0.40, $0.30, $0.20], with only $0.10 needed from Aave_Optimism).
      // t.log(readableSteps(plan.flow, depositBrand));
      arrayIsLike(t, plan?.flow, [
        { src: 'Aave_Base', dest: '@Base', amount: makeDeposit(scale6(0.3)) },
        { src: '@Base', dest: '@agoric', amount: makeDeposit(scale6(0.3)) },
        {
          src: 'Aave_Ethereum',
          dest: '@Ethereum',
          amount: makeDeposit(scale6(0.4)),
        },
        { src: '@Ethereum', dest: '@agoric', amount: makeDeposit(scale6(0.4)) },
        {
          src: 'Aave_Optimism',
          dest: '@Optimism',
          amount: makeDeposit(scale6(0.1)),
        },
        { src: '@Optimism', dest: '@agoric', amount: makeDeposit(scale6(0.1)) },
        { src: '@agoric', dest: '<Cash>', amount: makeDeposit(scale6(0.8)) },
      ]);
    },
  );
}
