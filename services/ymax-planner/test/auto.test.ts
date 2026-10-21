import test from 'ava';

import { AmountMath } from '@agoric/ertp';
import {
  fromTypedEntries,
  objectMap,
  objectMapMutable,
  typedEntries,
} from '@agoric/internal';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import type { Brand } from '@agoric/ertp/src/types.js';
import type { EvmAddress } from '@agoric/fast-usdc';
import { Far, isPrimitive } from '@endo/pass-style';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type {
  PoolKey,
  StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import {
  AxelarChain,
  Eip155ChainIds,
  UsdcTokenIds,
} from '@agoric/portfolio-api/src/constants.js';
import { chainOf, isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import {
  checkAutoRebalance,
  maybeAutoRebalance,
  pickAutoClaimSources,
  type AutoClaimConfig,
  type AutoRebalanceConfig,
  type AutoPowers,
} from '../src/auto.ts';
import {
  GAS_STATE_WINDOW_DURATIONS,
  GAS_STATE_WINDOW_METRICS,
  type ChainGasState,
} from '../src/gas-estimation.ts';
import { GAS_UNITS_PER_CLAIM, GAS_UNITS_PER_SWAP } from '../src/rewards.ts';
import { UserInputError } from '../src/support.ts';
import type {
  RewardTokenRate,
  YdsTokenBalance,
} from '../src/yds-portfolio-balances.ts';

const ceilDivide = (x: bigint, y: bigint) => (x + y - 1n) / y;
const countFractionalDigits = (x: number) => {
  const [, _n, f = '', e] = x
    .toExponential()
    .match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/)!;
  return Math.max(0, f.length - Number(e));
};

const mustGetOwn = <V>(
  obj: Partial<Record<string | symbol, V>>,
  key: string | symbol,
): V => {
  if (Object.hasOwn(obj, key)) return obj[key]!;
  throw Error(`key is missing: ${String(key)}`);
};

// Derived from
// https://github.com/sindresorhus/type-fest/blob/main/source/writable-deep.d.ts
type MutableDeep<T> = T extends unknown[]
  ? MutableArrayDeep<T>
  : T extends Function
    ? T
    : T extends object
      ? { -readonly [K in keyof T]: MutableDeep<T[K]> }
      : T;
type MutableArrayDeep<A extends unknown[]> = A extends []
  ? []
  : A extends [...infer U, infer V]
    ? [...MutableArrayDeep<U>, MutableDeep<V>]
    : A extends [infer U, ...infer V]
      ? [MutableDeep<U>, ...MutableArrayDeep<V>]
      : A extends ReadonlyArray<infer U>
        ? Array<MutableDeep<U>>
        : A extends Array<infer U>
          ? Array<MutableDeep<U>>
          : A;
const deepClone = <T>(value: T): MutableDeep<T> => {
  if (isPrimitive(value) || typeof value === 'function') return value as any;
  if (Array.isArray(value)) return value.map(deepClone) as any;
  return objectMapMutable(value as any, deepClone) as any;
};

const brand = Far('mock USDC brand') as Brand<'nat'>;
const makeAmount = (value: bigint) => AmountMath.make(brand, value);
type MockRewardTokenSymbol = 'reward1' | 'reward2';
const rewardTokensByChain: Record<
  AxelarChain,
  Record<MockRewardTokenSymbol, EvmAddress>
> = objectMap(AxelarChain, chainName => ({
  reward1: `0xReward1_${chainName}` as EvmAddress,
  reward2: `0xReward2_${chainName}` as EvmAddress,
}));

const defaultAutoClaimConfig: AutoClaimConfig = harden({
  maxGasCostSpike: [[1.5, 'P30D', 'p50']],
  maxSlippageBps: 200,
  minRewardPerGas: 2,
});

const autoRebalanceConfig: AutoRebalanceConfig = harden({
  driftBps: 100n,
  driftMinMoveUusdc: 25_000_000n,
  cashMinMoveUusdc: 25_000_000n,
});

const makeYdsTokenBalance = (
  placeRef: `@${AxelarChain}` | PoolKey,
  amount: bigint,
  symbol: 'USDC' | MockRewardTokenSymbol,
): YdsTokenBalance => {
  const chainName = chainOf(placeRef);
  const tokenId: string =
    symbol === 'USDC'
      ? mustGetOwn(UsdcTokenIds.mainnet, chainName)
      : mustGetOwn(rewardTokensByChain[chainName], symbol);
  return {
    chainName,
    caipChainId: `eip155:${mustGetOwn(Eip155ChainIds.mainnet, chainName)}`,
    instrumentName: isInstrumentId(placeRef) ? placeRef : null,
    symbol,
    tokenId,
    amount: `${amount}`,
  };
};

const makeYdsExchangeRate = (
  chainName: AxelarChain,
  inputs: { source: [bigint, string]; target?: [bigint?, string?] },
): RewardTokenRate => {
  const { source, target = [] } = inputs;
  const [sourceCount, sourceDenom] = source;
  const [targetCount = 1n, targetDenom = 'USDC'] = target;
  const targetTokenId =
    targetDenom === 'USDC'
      ? mustGetOwn(UsdcTokenIds.mainnet, chainName)
      : mustGetOwn(rewardTokensByChain[chainName], targetDenom);
  return {
    evmChainId: Number(mustGetOwn(Eip155ChainIds.mainnet, chainName)),
    priceProvider: 'mock price provider',
    sourceToken: mustGetOwn(rewardTokensByChain[chainName], sourceDenom),
    sourceDenom,
    sourceAmount: `${sourceCount}`,
    targetToken: targetTokenId as RewardTokenRate['targetToken'],
    targetDenom,
    targetAmount: `${targetCount}`,
    takenAtSec: 0,
  };
};

const makeGasCost = (
  chainName: AxelarChain,
  sampleUusd: number,
  sample: number = sampleUusd,
  history?: Partial<
    Record<
      (typeof GAS_STATE_WINDOW_DURATIONS)[number],
      Partial<
        Record<`${(typeof GAS_STATE_WINDOW_METRICS)[number]}Uusd`, number>
      >
    >
  >,
): ChainGasState => {
  const current: ChainGasState['current'] = {
    sampleBaseFee: 0,
    samplePriorityFee: 0,
    sample,
    sampleUusd,
    usdPerGasDenom: NaN,
    blockNumber: 1,
    blockTimestampSec: 0,
    takenAtSec: 0,
  };
  const windows = GAS_STATE_WINDOW_DURATIONS.map(duration => {
    const historyOverrides = history?.[duration];
    return {
      duration,
      untilSec: 0,
      sampleCount: 1,
      ...(fromTypedEntries(
        GAS_STATE_WINDOW_METRICS.flatMap(metricName => [
          [metricName, historyOverrides?.[metricName] ?? sample],
          [
            `${metricName}Uusd`,
            historyOverrides?.[`${metricName}Uusd`] ?? sampleUusd,
          ],
        ]),
      ) as Pick<
        ChainGasState['windows'][number],
        `${(typeof GAS_STATE_WINDOW_METRICS)[number]}${'' | 'Uusd'}`
      >),
    };
  });
  return {
    caip2Id: `eip155:${mustGetOwn(Eip155ChainIds.mainnet, chainName)}`,
    chainName,
    gasDenom: 'ETH',
    gasDenomScale: 9,
    current,
    windows,
  };
};

const makeAutoClaimPowers = (
  overrides: {
    defaultUusdPerGasUnit?: number;
    defaultGasUnitsPerClaim?: bigint;
  } = {},
): Pick<
  MutableDeep<Required<AutoPowers>>,
  | 'autoClaimConfig'
  | 'exchangeRates'
  | 'gasCosts'
  | 'gasEstimator'
  | 'usdcTokensByChain'
  | 'GAS_UNITS_PER_CLAIM'
  | 'GAS_UNITS_PER_SWAP'
> => {
  const { defaultUusdPerGasUnit = 1e-6, defaultGasUnitsPerClaim = 1_000_000n } =
    overrides;
  const powers = {
    autoClaimConfig: deepClone(defaultAutoClaimConfig),
    // Default exchange rate for each reward token is 1:1 with micro-USDC.
    exchangeRates: typedEntries(rewardTokensByChain).flatMap(
      ([chainName, tokens]) =>
        Object.keys(tokens).map((symbol: MockRewardTokenSymbol) =>
          makeYdsExchangeRate(chainName, { source: [1n, symbol] }),
        ),
    ),
    // Default gas costs are uniform and steady-state.
    gasCosts: typedEntries(Eip155ChainIds.mainnet).map(([chainName]) =>
      makeGasCost(chainName, defaultUusdPerGasUnit),
    ),
    gasEstimator: {} as any,
    usdcTokensByChain: UsdcTokenIds.mainnet,
    // Default gas units per claim are uniform.
    GAS_UNITS_PER_CLAIM: fromTypedEntries(
      typedEntries(rewardTokensByChain).flatMap(([_chainName, tokens]) =>
        Object.values(tokens).map(
          addr => [addr, defaultGasUnitsPerClaim] as [EvmAddress, bigint],
        ),
      ),
    ),
    GAS_UNITS_PER_SWAP: 10_000_000n,
  };
  return powers;
};

const makeSimpleAutoClaimInputs = () => {
  const chainName = 'Ethereum';
  const powers = makeAutoClaimPowers();
  const gasCostData = powers.gasCosts.find(r => r.chainName === chainName)!;
  const gasCostUusd =
    Number(powers.GAS_UNITS_PER_SWAP) * gasCostData.current.sampleUusd!;
  const slippedUusdValue = BigInt(
    Math.ceil(gasCostUusd * powers.autoClaimConfig.minRewardPerGas),
  );
  const slippageDenominator = 10_000 - powers.autoClaimConfig.maxSlippageBps;
  const slippageScale = countFractionalDigits(slippageDenominator);
  const uusdValue = ceilDivide(
    slippedUusdValue * 10_000n * 10n ** BigInt(slippageScale),
    BigInt(Math.round(slippageDenominator * 10 ** slippageScale)),
  );
  const balances = [
    // noise
    makeYdsTokenBalance('@Ethereum', uusdValue, 'USDC'),
    makeYdsTokenBalance('Compound_Ethereum', uusdValue, 'USDC'),
    // swappable at 1:1
    makeYdsTokenBalance('@Ethereum', uusdValue, 'reward1'),
  ];
  return { balances, powers, uusdValue };
};

test('pickAutoClaimSources obeys autoClaimConfig', t => {
  const { balances, powers, uusdValue } = makeSimpleAutoClaimInputs();
  harden(powers);
  const picks = pickAutoClaimSources(balances, powers);
  t.deepEqual(picks, [
    {
      ...makeYdsTokenBalance('@Ethereum', uusdValue, 'reward1'),
      uusdcValue: uusdValue,
      usdcTokenId: mustGetOwn(UsdcTokenIds.mainnet, 'Ethereum'),
    },
  ]);

  const { autoClaimConfig: baseConfig } = powers;
  {
    const maxGasCostSpike: (typeof baseConfig)['maxGasCostSpike'] = [
      // noise
      [100, 'PT15M', 'max'],
      // relevant
      [2, 'PT15M', 'max'],
      // noise
      [100, 'P30D', 'p50'],
    ];
    const autoClaimConfig = { ...baseConfig, maxGasCostSpike };
    const newPicks = pickAutoClaimSources(balances, {
      ...powers,
      autoClaimConfig,
    });
    t.deepEqual(newPicks, picks, 'maxGasCostSpike with no spike');

    // We'll locally override Ethereum gas costs.
    const gasCosts = deepClone(powers.gasCosts);
    const ethGasCost = gasCosts.find(r => r.chainName === 'Ethereum')!;
    const ethPT15M = ethGasCost.windows.find(w => w.duration === 'PT15M')!;
    const gasSpikePowers = { ...powers, autoClaimConfig, gasCosts };

    ethPT15M.maxUusd /= 2;
    const maxSpikePicks = pickAutoClaimSources(balances, gasSpikePowers);
    t.deepEqual(
      maxSpikePicks,
      picks,
      'maxGasCostSpike during maximal allowed spike',
    );

    ethPT15M.maxUusd /= 1.01;
    const overSpikePicks = pickAutoClaimSources(balances, gasSpikePowers);
    t.is(overSpikePicks, null, 'maxGasCostSpike during excessive spike');
  }
  {
    // Increasing max slippage should filter out the claim picks.
    const maxSlippageBps = baseConfig.maxSlippageBps + 300;
    const autoClaimConfig = { ...baseConfig, maxSlippageBps };
    const newPicks = pickAutoClaimSources(balances, {
      ...powers,
      autoClaimConfig,
    });
    t.is(newPicks, null, 'maxSlippageBps');
  }
  {
    // Reducing reward balances should filter out the claim picks.
    const reducedBalances = balances.map(b => {
      const { amount } = b;
      return { ...b, amount: `${BigInt(amount) - 1n}` as `${bigint}` };
    });
    const newPicks = pickAutoClaimSources(reducedBalances, powers);
    t.is(newPicks, null, 'minRewardPerGas');
  }
});

test('pickAutoClaimSources requires exchange rates and gas costs', t => {
  const { balances, powers } = makeSimpleAutoClaimInputs();
  t.truthy(pickAutoClaimSources(balances, powers)?.length, 'sanity check');
  t.is(
    pickAutoClaimSources(balances, { ...powers, exchangeRates: undefined }),
    null,
    'no exchange rates',
  );
  t.is(
    pickAutoClaimSources(balances, { ...powers, gasCosts: undefined }),
    null,
    'no gas costs',
  );
});

test('pickAutoClaimSources amortizes swap gas across profitable claims', t => {
  const gasUnitsPerClaim = 1_000_000n;
  const gasUnitsPerSwap = 10_000_000n;
  const powers = makeAutoClaimPowers({
    defaultUusdPerGasUnit: 1,
    defaultGasUnitsPerClaim: gasUnitsPerClaim,
  });
  powers.autoClaimConfig.maxSlippageBps = 0;
  powers.autoClaimConfig.minRewardPerGas = 1;
  powers.GAS_UNITS_PER_SWAP = gasUnitsPerSwap;

  // Create claimable reward token balances in two positions for which claiming
  // independently satisfies our criteria but the full claim-and-swap requires
  // an existing balance.
  const balances = [
    // Arbitrum: barely not justified
    makeYdsTokenBalance(
      'Aave_Arbitrum',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward1',
    ),
    makeYdsTokenBalance(
      'Compound_Arbitrum',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward1',
    ),
    makeYdsTokenBalance('@Arbitrum', 1n, 'reward1'),
    // noise
    makeYdsTokenBalance(
      'Beefy_compoundUsdc_Arbitrum',
      gasUnitsPerClaim - 1n,
      'reward1',
    ),
    makeYdsTokenBalance('@Arbitrum', gasUnitsPerSwap - 1n, 'reward2'),

    // Optimism: justified by previous claims
    makeYdsTokenBalance(
      'Aave_Optimism',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward2',
    ),
    makeYdsTokenBalance(
      'Compound_Optimism',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward2',
    ),
    makeYdsTokenBalance('@Optimism', 2n, 'reward2'),
    // noise
    makeYdsTokenBalance(
      'Beefy_compoundUsdc_Optimism',
      gasUnitsPerClaim - 1n,
      'reward2',
    ),
    makeYdsTokenBalance('@Optimism', gasUnitsPerSwap - 1n, 'reward1'),
  ];
  arrayIsLike(t, pickAutoClaimSources(balances, powers) || [], [
    makeYdsTokenBalance('@Optimism', 2n, 'reward2'),
    makeYdsTokenBalance(
      'Aave_Optimism',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward2',
    ),
    makeYdsTokenBalance(
      'Compound_Optimism',
      gasUnitsPerClaim + gasUnitsPerSwap / 2n - 1n,
      'reward2',
    ),
  ]);
});

test('checkAutoRebalance trigger: Position Drift', t => {
  const targetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 50n,
  };

  {
    const balancedValue = 25_000_000n * 50n;
    const resultAtBpsThreshold = checkAutoRebalance(
      targetAllocation,
      {
        USDN: makeAmount(balancedValue - 25_000_000n),
        Aave_Arbitrum: makeAmount(balancedValue + 25_000_000n),
      },
      {
        USDN: makeAmount(balancedValue),
        Aave_Arbitrum: makeAmount(balancedValue),
      },
      autoRebalanceConfig,
    );
    t.is(
      resultAtBpsThreshold,
      null,
      "trigger doesn't fire at the basis-point drift threshold",
    );
  }
  {
    const balancedValue = 25_000_000n * 50n - 1n;
    const resultOverBpsThreshold = checkAutoRebalance(
      targetAllocation,
      {
        USDN: makeAmount(balancedValue - 25_000_000n),
        Aave_Arbitrum: makeAmount(balancedValue + 25_000_000n),
      },
      {
        USDN: makeAmount(balancedValue),
        Aave_Arbitrum: makeAmount(balancedValue),
      },
      autoRebalanceConfig,
    );
    const { greatestBpsDrift, ...nonFloatFields } = {
      ...resultOverBpsThreshold,
    } as any;
    t.deepEqual(
      resultOverBpsThreshold && nonFloatFields,
      { reason: 'POSITION_DRIFT', totalMoved: 25_000_000n },
      'trigger fires just over the basis-point drift threshold',
    );
    t.true(
      greatestBpsDrift > 100 && greatestBpsDrift < 101,
      `basis-point drift: ${greatestBpsDrift}`,
    );
  }
  {
    const balancedValue = 24_999_999n * 50n - 1n;
    const resultAtBpsThreshold = checkAutoRebalance(
      targetAllocation,
      {
        USDN: makeAmount(balancedValue - 24_999_999n),
        Aave_Arbitrum: makeAmount(balancedValue + 24_999_999n),
      },
      {
        USDN: makeAmount(balancedValue),
        Aave_Arbitrum: makeAmount(balancedValue),
      },
      autoRebalanceConfig,
    );
    t.is(
      resultAtBpsThreshold,
      null,
      "trigger doesn't fire below the minimum movement threshold",
    );
  }
});

test('checkAutoRebalance trigger: Excess Cash', t => {
  const targetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 50n,
  };

  {
    const balancedValue = 12_500_000n;
    const resultUnderCashThreshold = checkAutoRebalance(
      targetAllocation,
      {
        '@agoric': makeAmount(24_999_999n),
        USDN: makeAmount(1n),
      },
      {
        USDN: makeAmount(balancedValue),
        Aave_Arbitrum: makeAmount(balancedValue),
      },
      autoRebalanceConfig,
    );
    t.is(
      resultUnderCashThreshold,
      null,
      "trigger doesn't fire under the excess-cash threshold",
    );
  }
  {
    const balancedValue = 12_500_000n;
    const resultAtCashThreshold = checkAutoRebalance(
      targetAllocation,
      {
        '@agoric': makeAmount(balancedValue),
        '@Base': makeAmount(balancedValue),
      },
      {
        USDN: makeAmount(balancedValue),
        Aave_Arbitrum: makeAmount(balancedValue),
      },
      autoRebalanceConfig,
    );
    t.deepEqual(
      resultAtCashThreshold,
      { reason: 'EXCESS_CASH', excessCashAllocated: 25_000_000n },
      'trigger fires at the excess-cash threshold',
    );
  }

  t.is(
    checkAutoRebalance(
      { ...targetAllocation, '@Base': 25n },
      {
        '@Base': makeAmount(25_000_000n),
        USDN: makeAmount(50_000_000n),
        Aave_Arbitrum: makeAmount(50_000_000n),
      },
      {
        '@Base': makeAmount(25_000_000n),
        USDN: makeAmount(50_000_000n),
        Aave_Arbitrum: makeAmount(50_000_000n),
      },
      autoRebalanceConfig,
    ),
    null,
    'cash at or below its target allocation is not excess',
  );

  t.deepEqual(
    checkAutoRebalance(
      { USDN: 0n, Aave_Arbitrum: 1n },
      { '@agoric': makeAmount(25_000_000n) },
      { USDN: makeAmount(25_000_000n) },
      autoRebalanceConfig,
    ),
    { reason: 'EXCESS_CASH', excessCashAllocated: 25_000_000n },
  );
});

const makeAutoPortfolioStatus = (
  overrides: Partial<StatusFor['portfolio']> = {},
): StatusFor['portfolio'] =>
  harden({
    policyVersion: 3,
    rebalanceCount: 4,
    positionKeys: ['USDN'],
    accountIdByChain: {},
    flowCount: 0,
    targetAllocation: { USDN: 1n },
    enabledAutoFeatures: { rebalance: true },
    ...overrides,
  });

const makeMaybeAutoPowers = (overrides: Partial<AutoPowers> = {}) => {
  const logs: unknown[][] = [];
  const warns: unknown[][] = [];
  const errors: unknown[][] = [];
  const rebalanceCalls: unknown[][] = [];
  const ydsTransactionCalls: unknown[] = [];
  const transactionHash = `0x${'b'.repeat(64)}`;
  const powers: AutoPowers = {
    autoClaimConfig: defaultAutoClaimConfig,
    autoRebalance: autoRebalanceConfig,
    console: {
      error: (...args) => errors.push(args),
      log: (...args) => logs.push(args),
      warn: (...args) => warns.push(args),
    },
    depositBrand: brand,
    feeBrand: brand,
    gasEstimator: {} as any,
    getWalletInvocationUpdate: async () => undefined,
    inspectForStdout: () => '<details>',
    isDryRun: true,
    makeNonce: () => 'memo-123',
    network: TEST_NETWORK,
    planRebalanceToAllocations: async () => ({
      flow: [
        {
          src: '@noble',
          dest: 'USDN',
          amount: makeAmount(25_000_000n),
        },
      ],
      order: undefined,
    }),
    portfoliosPathPrefix: 'published.ymax0.portfolios',
    postYdsTransaction: async txHash => {
      ydsTransactionCalls.push(txHash);
    },
    usdcTokensByChain: {},
    walletStore: {
      get: () =>
        ({
          rebalance: (...args: unknown[]) => {
            rebalanceCalls.push(args);
            return { tx: { transactionHash }, id: 'mock-id' };
          },
        }) as any,
      saveOfferResult: () => {
        throw new Error('unexpected call to walletStore.saveOfferResult');
      },
    },
    GAS_UNITS_PER_CLAIM,
    GAS_UNITS_PER_SWAP,
    ...overrides,
  };
  return {
    errors,
    logs,
    powers,
    rebalanceCalls,
    txHash: transactionHash,
    ydsTransactionCalls,
    warns,
  };
};

test('maybeAutoRebalance submits planner rebalance when criteria fire', async t => {
  const { powers, rebalanceCalls } = makeMaybeAutoPowers();

  await maybeAutoRebalance(
    makeAutoPortfolioStatus(),
    'portfolio7',
    { '@noble': makeAmount(25_000_000n) },
    powers,
  );

  t.deepEqual(rebalanceCalls, [
    [
      7,
      {
        syncState: { policyVersion: 3, rebalanceCount: 4 },
        agentMemo: 'memo-123',
      },
      [{ src: '@noble', dest: 'USDN', amount: makeAmount(25_000_000n) }],
    ],
  ]);
});

test('maybeAutoRebalance posts submitted transaction to YDS outside dry run', async t => {
  const { powers, txHash, ydsTransactionCalls } = makeMaybeAutoPowers({
    isDryRun: false,
  });

  await maybeAutoRebalance(
    makeAutoPortfolioStatus(),
    'portfolio7',
    { '@noble': makeAmount(25_000_000n) },
    powers,
  );

  t.deepEqual(ydsTransactionCalls, [txHash]);
});

test('maybeAutoRebalance logs YDS post failures with transaction context', async t => {
  const postError = Error('YDS unavailable');
  const { errors, powers, txHash } = makeMaybeAutoPowers({
    isDryRun: false,
    postYdsTransaction: async () => {
      throw postError;
    },
  });

  await maybeAutoRebalance(
    makeAutoPortfolioStatus(),
    'portfolio7',
    { '@noble': makeAmount(25_000_000n) },
    powers,
  );
  await Promise.resolve();

  t.deepEqual(errors, [
    [
      '[portfolio7.autoRebalance]',
      '🚨 Failure posting transaction to YDS',
      { txHash, agentMemo: 'memo-123' },
      postError,
    ],
  ]);
});

test('maybeAutoRebalance skips when auto feature is disabled or criteria do not fire', async t => {
  {
    const { powers, rebalanceCalls } = makeMaybeAutoPowers();
    await maybeAutoRebalance(
      makeAutoPortfolioStatus({ enabledAutoFeatures: { rebalance: false } }),
      'portfolio7',
      { '@noble': makeAmount(25_000_000n) },
      powers,
    );
    t.deepEqual(rebalanceCalls, []);
  }
  {
    const { logs, powers, rebalanceCalls } = makeMaybeAutoPowers();
    await maybeAutoRebalance(
      makeAutoPortfolioStatus(),
      'portfolio7',
      { USDN: makeAmount(25_000_000n) },
      powers,
    );
    t.deepEqual(rebalanceCalls, []);
    t.is(logs[0]?.[1], 'skip');
  }
});

test('maybeAutoRebalance skips empty plans and user-correctable failures', async t => {
  {
    const { logs, powers, rebalanceCalls } = makeMaybeAutoPowers({
      planRebalanceToAllocations: async () => ({
        flow: [],
        order: undefined,
      }),
    });
    await maybeAutoRebalance(
      makeAutoPortfolioStatus(),
      'portfolio7',
      { '@noble': makeAmount(25_000_000n) },
      powers,
    );
    t.deepEqual(rebalanceCalls, []);
    t.is(logs[0]?.[1], 'skip');
  }
  {
    const { powers, warns } = makeMaybeAutoPowers({
      planRebalanceToAllocations: async () => {
        throw new UserInputError('bad target');
      },
    });
    await maybeAutoRebalance(
      makeAutoPortfolioStatus(),
      'portfolio7',
      { '@noble': makeAmount(25_000_000n) },
      powers,
    );
    t.true(String(warns[0]?.[1]).includes('Skipping auto rebalance'));
  }
});
