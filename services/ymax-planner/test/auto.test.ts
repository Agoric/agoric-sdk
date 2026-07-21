import test from 'ava';

import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/pass-style';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import {
  checkAutoRebalance,
  maybeAutoRebalance,
  type AutoPowers,
} from '../src/auto.ts';
import { UserInputError } from '../src/support.ts';

const brand = Far('mock USDC brand') as Brand<'nat'>;
const makeAmount = (value: bigint) => AmountMath.make(brand, value);

const config = harden({
  driftBps: 100n,
  driftMinMoveUusdc: 25_000_000n,
  cashMinMoveUusdc: 25_000_000n,
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
      config,
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
      config,
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
      config,
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
      config,
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
      config,
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
      config,
    ),
    null,
    'cash at or below its target allocation is not excess',
  );

  t.deepEqual(
    checkAutoRebalance(
      { USDN: 0n, Aave_Arbitrum: 1n },
      { '@agoric': makeAmount(25_000_000n) },
      { USDN: makeAmount(25_000_000n) },
      config,
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

const makeMaybeAutoPowers = (
  overrides: Partial<AutoPowers> = {},
) => {
  const logs: unknown[][] = [];
  const warns: unknown[][] = [];
  const errors: unknown[][] = [];
  const rebalanceCalls: unknown[][] = [];
  const ydsTransactionCalls: unknown[] = [];
  const transactionHash = `0x${'b'.repeat(64)}`;
  const powers: AutoPowers = {
    autoRebalance: config,
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
