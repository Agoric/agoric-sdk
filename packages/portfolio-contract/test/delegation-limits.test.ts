/** @file Tests for delegated portfolio mandates and plan evidence. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { Address as EvmAddress } from 'abitype';
import { makeIssuerKit, type NatValue } from '@agoric/ertp';
import { fc, testProp } from '@fast-check/ava';
import type {
  AssetPlaceRef,
  FundsFlowPlan,
  InstrumentId,
  PlanObservations,
  PortfolioBalancePlaceRef,
  TargetAllocation,
  TypedHoldingDetail,
  WithdrawParams,
} from '@agoric/portfolio-api';
import { chainOf, isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import {
  assertMandateForAllocation,
  assertMandateForPlanObservations,
  vetObservationPlaces,
  vetAllocationPlan,
  vetPlanAllocation,
} from '../src/delegation-limits.ts';
import type { MovementDesc } from '../src/type-guards-steps.ts';
import { makeSchedule } from '../src/schedule-order.ts';

const { brand: USDC } = makeIssuerKit('USDC');

const holdingTokens = {
  vault: `0x${'1'.repeat(40)}`,
  usdc: `0x${'2'.repeat(40)}`,
  reward: `0x${'3'.repeat(40)}`,
  otherVault: `0x${'4'.repeat(40)}`,
} as const;

const makeHolding = (
  detail: Omit<
    Extract<TypedHoldingDetail, { tokenId: `0x${string}` }>,
    'tokenId'
  >,
) => ({
  ...detail,
  tokenId:
    detail.kind === 'shares'
      ? holdingTokens.vault
      : detail.kind === 'claimable-reward'
        ? holdingTokens.reward
        : holdingTokens.usdc,
});

const makeHoldingObservations = (
  holdings: TypedHoldingDetail[],
  instrumentTvls: PlanObservations['instrumentTvls'] = {},
): PlanObservations => ({ balances: {}, holdings, instrumentTvls });

const makeMaximumWithdrawalCase = ({
  shareQuantity = 50n,
  valueUusd = 100_000_000n,
  minimumProceeds = 0n,
} = {}) => {
  const instrument = 'ERC4626_morphoGauntletUsdcRwa_Ethereum' as const;
  const shares = makeHolding({
    place: instrument,
    kind: 'shares',
    amount: shareQuantity,
    valueUusd,
  });
  const observations = makeHoldingObservations([shares]);
  const movement: MovementDesc = {
    src: instrument,
    dest: '@Ethereum',
    amount: { brand: USDC, value: minimumProceeds },
    withdraw: { max: true },
  };
  const checkAllocation = (
    target: TargetAllocation,
    plan: FundsFlowPlan = { flow: [movement] },
    evidence = observations,
  ) => vetPlanAllocation(target, plan, evidence, () => holdingTokens.usdc);
  return { instrument, shares, observations, movement, checkAllocation };
};

const staticObservations = harden({
  balances: {
    '@Base': 400_000_000_000n,
    Aave_Base: 600_000_000_000n,
  },
  instrumentTvls: {
    Aave_Base: { tvlUsd: 20_000_000n },
    Compound_Base: { tvlUsd: 50_000_000n },
  },
});

const allocation = harden({ Aave_Base: 60n, Compound_Base: 40n });

type ProjectedBalances = Record<string, bigint>;

const totalBalance = (balances: ProjectedBalances) =>
  Object.values(balances).reduce((total, balance) => total + balance, 0n);

type Ratio = { top: bigint; bot: bigint };

const lte = (exposureShare: Ratio, max: Ratio) =>
  exposureShare.top * max.bot <= max.top * exposureShare.bot;

const withinRiskEnvelope = (
  initial: ProjectedBalances,
  current: ProjectedBalances,
  targetAllocation: TargetAllocation,
) => {
  const initialTotal = totalBalance(initial);
  const currentTotal = totalBalance(current);
  const totalPortions = Object.values(targetAllocation).reduce(
    (total, portion = 0n) => total + portion,
    0n,
  );
  return Object.entries(targetAllocation).every(([place, ceiling = 0n]) => {
    const exposureShare = { top: current[place] ?? 0n, bot: currentTotal };

    const targetCeiling = { top: ceiling, bot: totalPortions };
    if (lte(exposureShare, targetCeiling)) return true;

    const initialShare = { top: initial[place] ?? 0n, bot: initialTotal };
    if (lte(exposureShare, initialShare)) return true;

    return false;
  });
};

const arbPlan = (balances: Map<PortfolioBalancePlaceRef, NatValue>) => {
  const instruments = [...balances.keys()].filter(isInstrumentId);
  const accountByInstrument = new Map(
    instruments.map(instrument => [
      instrument,
      `@${chainOf(instrument)}` as AssetPlaceRef,
    ]),
  );
  const accounts = [
    ...new Set([
      ...[...balances.keys()].filter(place => !isInstrumentId(place)),
      ...accountByInstrument.values(),
    ]),
  ];
  const places: AssetPlaceRef[] = [...instruments, ...accounts];
  const total = [...balances.values()].reduce(
    (sum, balance) => sum + balance,
    0n,
  );
  const arbChoice = fc.record({
    source: fc.nat(),
    destination: fc.nat(),
    amount: fc.bigInt({ min: 1n, max: total || 1n }),
  });

  return fc.array(arbChoice, { minLength: 1, maxLength: 8 }).map(choices => {
    const projected = new Map<AssetPlaceRef, NatValue>(balances);
    for (const account of accounts) {
      if (!projected.has(account)) projected.set(account, 0n);
    }
    const flow: MovementDesc[] = [];

    for (const choice of choices) {
      const funded = places.filter(
        place =>
          (projected.get(place) ?? 0n) > 0n &&
          (isInstrumentId(place) ||
            instruments.some(
              instrument => `@${chainOf(instrument)}` === place,
            )),
      );
      if (funded.length === 0) break;
      const src = funded[choice.source % funded.length];
      const destinations = isInstrumentId(src)
        ? [accountByInstrument.get(src)!]
        : instruments.filter(instrument => `@${chainOf(instrument)}` === src);
      if (destinations.length === 0) continue;
      const dest = destinations[choice.destination % destinations.length];
      const available = projected.get(src)!;
      const value = ((choice.amount - 1n) % available) + 1n;
      flow.push({ src, dest, amount: { brand: USDC, value } });
      projected.set(src, available - value);
      projected.set(dest, (projected.get(dest) ?? 0n) + value);
    }

    return harden({ flow }) satisfies FundsFlowPlan;
  });
};

const testAccounts: PortfolioBalancePlaceRef[] = ['@Arbitrum', '@Base'];
const testInstruments: InstrumentId[] = [
  'Aave_Arbitrum',
  'Compound_Arbitrum',
  'Aave_Base',
  'Compound_Base',
];

const arbBalances = fc
  .subarray(testAccounts, { minLength: 1 })
  .chain(accounts => {
    const accountSet = new Set(accounts);
    const relevantInstruments = testInstruments.filter(instrument =>
      accountSet.has(`@${chainOf(instrument)}`),
    );
    return fc
      .subarray(relevantInstruments, { minLength: 1 })
      .chain(instruments => {
        const places: PortfolioBalancePlaceRef[] = [
          ...accounts,
          ...instruments,
        ];
        return fc
          .array(fc.bigInt({ min: 0n, max: 999_999n }), {
            minLength: places.length,
            maxLength: places.length,
          })
          .map(values => {
            const fundedValues = values.map((value, index) =>
              index === accounts.length ? value + 1n : value,
            );
            return new Map(
              places.map((place, index) => [place, fundedValues[index]]),
            );
          });
      });
  });

const arbScenario = arbBalances.chain(balances => {
  const instruments = [...balances.keys()].filter(isInstrumentId);
  return fc
    .array(fc.bigInt({ min: 1n, max: 100n }), {
      minLength: instruments.length,
      maxLength: instruments.length,
    })
    .chain(portions => {
      const targetAllocation: TargetAllocation = Object.fromEntries(
        instruments.map((instrument, index) => [instrument, portions[index]]),
      );
      return arbPlan(balances).map(plan => ({
        balances,
        targetAllocation,
        plan,
      }));
    });
});

/** Construct a fully ordered plan that withdraws excess before depositing deficits. */
const makeWitnessPlan = ({
  account,
  instruments,
  initialBalances,
  desiredBalances,
}: {
  account: PortfolioBalancePlaceRef;
  instruments: InstrumentId[];
  initialBalances: ProjectedBalances;
  desiredBalances: ProjectedBalances;
}): FundsFlowPlan => {
  const withdrawals: MovementDesc[] = [];
  const deposits: MovementDesc[] = [];
  for (const instrument of instruments) {
    const delta = desiredBalances[instrument] - initialBalances[instrument];
    if (delta < 0n) {
      withdrawals.push({
        src: instrument,
        dest: account,
        amount: { brand: USDC, value: -delta },
      });
    } else if (delta > 0n) {
      deposits.push({
        src: account,
        dest: instrument,
        amount: { brand: USDC, value: delta },
      });
    }
  }
  // Omitting order selects the contract's default full sequential order.
  return { flow: [...withdrawals, ...deposits] };
};

/**
 * Generate a scenario for one authorized chain account and a non-empty subset
 * of its instruments:
 *
 * - a non-zero initial balance state;
 * - a target allocation;
 * - a desired state that conserves the initial total, keeps each instrument at
 *   or below its target-weighted share, and leaves the remainder in cash; and
 * - a safely ordered witness plan.
 *
 * The plan withdraws excess balances before depositing deficits, so every
 * sequential prefix remains within the initial-or-target risk envelope.
 */
const arbSafelyReachableScenario = fc
  .constantFrom(...testAccounts)
  .chain(account => {
    const accountInstruments = testInstruments.filter(
      instrument => `@${chainOf(instrument)}` === account,
    );
    return fc
      .subarray(accountInstruments, { minLength: 1 })
      .chain(instruments => {
        const places: PortfolioBalancePlaceRef[] = [account, ...instruments];
        return fc
          .record({
            values: fc.array(fc.bigInt({ min: 0n, max: 999_999n }), {
              minLength: places.length,
              maxLength: places.length,
            }),
            portions: fc.array(fc.bigInt({ min: 1n, max: 100n }), {
              minLength: instruments.length,
              maxLength: instruments.length,
            }),
            desiredFractions: fc.array(fc.bigInt({ min: 0n, max: 100n }), {
              minLength: instruments.length,
              maxLength: instruments.length,
            }),
          })
          .map(({ values, portions, desiredFractions }) => {
            const fundedValues = values.map((value, index) =>
              index === 1 ? value + 1n : value,
            );
            const initial: ProjectedBalances = Object.fromEntries(
              places.map((place, index) => [place, fundedValues[index]]),
            );
            const total = totalBalance(initial);
            const totalPortions = portions.reduce(
              (sum, portion) => sum + portion,
              0n,
            );
            const targetAllocation: TargetAllocation = Object.fromEntries(
              instruments.map((instrument, index) => [
                instrument,
                portions[index],
              ]),
            );
            const desired: ProjectedBalances = Object.fromEntries([
              [account, 0n],
              ...instruments.map((instrument, index) => {
                const ceiling = (total * portions[index]) / totalPortions;
                return [instrument, (ceiling * desiredFractions[index]) / 100n];
              }),
            ]);
            desired[account] =
              total -
              instruments.reduce(
                (sum, instrument) => sum + desired[instrument],
                0n,
              );

            const plan = makeWitnessPlan({
              account,
              instruments,
              initialBalances: initial,
              desiredBalances: desired,
            });
            return {
              pre: { balances: initial },
              request: { targetAllocation, plan },
              desired: { balances: desired },
            };
          });
      });
  });

test('zero-step plan stays within its risk envelope', t => {
  const targetAllocation = {
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
  };
  const balances = { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n };
  const observations: PlanObservations = { balances, instrumentTvls: {} };
  const plan: FundsFlowPlan = { flow: [] };

  t.notThrows(() => vetPlanAllocation(targetAllocation, plan, observations));
  t.true(withinRiskEnvelope(balances, balances, targetAllocation));
});

/**
 * Liveness condition:
 *
 * Given:
 *
 * - a non-zero initial balance state;
 * - a desired final state over already-authorized places; and
 * - a target allocation.
 *
 * Require the desired state to:
 *
 * - conserve value;
 * - stay within every target instrument ceiling; and
 * - be reachable through supported movements without exceeding the greater of
 *   each instrument's initial or target share.
 *
 * Then at least one ordered plan reaches the desired state and is accepted.
 *
 * {@link arbSafelyReachableScenario} samples the "Given" and "Require" parts
 * for one chain account and its instruments. {@link makeWitnessPlan} supplies
 * the ordered plan that witnesses "at least one".
 *
 * Contract acceptance is static validation only. It does not imply that the
 * plan will succeed at runtime.
 */
testProp(
  'every safely reachable desired state has an accepted plan',
  [arbSafelyReachableScenario],
  (t, { pre, request, desired }) => {
    const { balances: initial } = pre;
    const { targetAllocation, plan } = request;
    const { balances: desiredBalances } = desired;
    const observations: PlanObservations = {
      balances: initial,
      instrumentTvls: {},
    };
    const total = totalBalance(initial);
    const totalPortions = Object.values(targetAllocation).reduce(
      (sum, portion = 0n) => sum + portion,
      0n,
    );

    t.is(totalBalance(desiredBalances), total, 'desired state conserves value');
    for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
      t.true(
        desiredBalances[instrument] * totalPortions <= total * portion,
        `${instrument} is within its target ceiling`,
      );
    }

    t.notThrows(() => vetPlanAllocation(targetAllocation, plan, observations));

    const actual = { ...initial };
    for (const [index, { src, dest, amount }] of plan.flow.entries()) {
      actual[src] -= amount.value;
      actual[dest] += amount.value;
      t.true(
        withinRiskEnvelope(initial, actual, targetAllocation),
        `safe prefix ending at step ${index + 1}`,
      );
    }
    t.deepEqual(actual, desiredBalances);
  },
  { numRuns: 1_000 },
);

/**
 * The safety constraint intentionally prohibits some useful agent actions. An
 * Aave runtime constraint might require depositing $0.95 before withdrawing
 * $1.00 to reduce a position by $0.05. Although the final state is exactly at
 * its 50% target, failure of the withdrawal would leave the position larger
 * than both its initial balance and its target ceiling, so the plan is unsafe.
 */
test('safety rejects a temporary increase needed to reduce exposure', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, '@Arbitrum': 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100_100_000n,
      '@Arbitrum': 100_000_000n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: { brand: USDC, value: 950_000n },
      },
      {
        src: 'Aave_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 1_000_000n },
      },
    ],
  };

  const afterDeposit = 100_100_000n + 950_000n;
  const finalAave = afterDeposit - 1_000_000n;
  const finalCash = 100_000_000n - 950_000n + 1_000_000n;
  t.true(afterDeposit > observations.balances.Aave_Arbitrum!);
  t.deepEqual(
    { Aave_Arbitrum: finalAave, '@Arbitrum': finalCash },
    { Aave_Arbitrum: 100_050_000n, '@Arbitrum': 100_050_000n },
  );
  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message:
      /plan (final|intermediate) balance exceeds target allocation.*Aave_Arbitrum/,
  });
});

testProp(
  'accepted plans stay within the risk envelope after every successful prefix',
  [arbScenario],
  (t, { balances, targetAllocation, plan }) => {
    const initial: ProjectedBalances = Object.fromEntries(balances);
    for (const { src, dest } of plan.flow) {
      initial[src] ??= 0n;
      initial[dest] ??= 0n;
    }
    const observations: PlanObservations = {
      balances: initial,
      instrumentTvls: {},
    };
    try {
      vetPlanAllocation(targetAllocation, plan, observations);
    } catch {
      t.pass('plan rejected');
      return;
    }

    const current = { ...initial };
    t.true(
      withinRiskEnvelope(initial, current, targetAllocation),
      'initial state',
    );
    for (const [index, { src, dest, amount }] of plan.flow.entries()) {
      current[src] = (current[src] ?? 0n) - amount.value;
      current[dest] = (current[dest] ?? 0n) + amount.value;
      t.true(
        withinRiskEnvelope(initial, current, targetAllocation),
        `successful prefix ending at step ${index + 1}`,
      );
    }
  },
  { numRuns: 1_000 },
);

test('plan allocation is bounded by instrument ceilings', t => {
  const targetAllocation: TargetAllocation = {
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
  };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 120n,
      Compound_Arbitrum: 80n,
    },
    instrumentTvls: {},
  };
  const underCeilings: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 20n },
      },
    ],
  };
  t.notThrows(() =>
    vetPlanAllocation(targetAllocation, underCeilings, observations),
  );

  const overCompoundCeiling: FundsFlowPlan = {
    flow: [
      ...underCeilings.flow,
      {
        src: '@Arbitrum',
        dest: 'Compound_Arbitrum',
        amount: { brand: USDC, value: 20n },
      },
    ],
  };
  t.throws(
    () =>
      vetPlanAllocation(targetAllocation, overCompoundCeiling, observations),
    {
      message:
        /plan (final|intermediate) balance exceeds target allocation.*Compound_Arbitrum/,
    },
  );
});

test('plan allocation checks exact ceiling arithmetic', t => {
  const targetAllocation: TargetAllocation = {
    Aave_Arbitrum: 50n,
    Compound_Arbitrum: 50n,
  };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 120_003_400n,
      Compound_Arbitrum: 80_002_300n,
    },
    instrumentTvls: {},
  };
  const planFor = (value: bigint): FundsFlowPlan => ({
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: 'Compound_Arbitrum',
        amount: { brand: USDC, value },
      },
    ],
  });

  // One micro-USDC beyond the 1 USDC allowance must fail.
  t.throws(
    () =>
      vetPlanAllocation(targetAllocation, planFor(19_000_549n), observations),
    {
      message:
        /plan (final|intermediate) balance exceeds target allocation.*Aave_Arbitrum/,
    },
  );
  t.notThrows(() =>
    vetPlanAllocation(targetAllocation, planFor(19_000_550n), observations),
  );
});

test('allocation operation rejects a plan over its target ceiling', t => {
  const targetAllocation = { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 120_003_400n,
      Compound_Arbitrum: 80_002_300n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: 'Compound_Arbitrum',
        amount: { brand: USDC, value: 20_000_000n },
      },
    ],
  };

  t.throws(
    () =>
      vetAllocationPlan(
        harden({ allocation: { maxWeightBps: 6_000n } }),
        targetAllocation,
        plan,
        harden(observations),
      ),
    {
      message:
        /plan (final|intermediate) balance exceeds target allocation.*Compound_Arbitrum/,
    },
  );
});

test('allocation plan cannot reach an instrument through another chain account', t => {
  // AGO-1656: a step runs on its account's chain, so `@Base -> Aave_Arbitrum`
  // would supply Aave on Base, which the owner did not allow, while every
  // mandate check values the declared Aave_Arbitrum.
  const permissions = harden({ allocation: { maxWeightBps: 2_000n } });
  const aave = ['Arbitrum', 'Avalanche', 'Optimism', 'Ethereum'] as const;
  const targetAllocation: TargetAllocation = {
    '@Base': 20n,
    ...Object.fromEntries(aave.map(chain => [`Aave_${chain}`, 20n])),
  };
  const observations: PlanObservations = harden({
    balances: {
      '@Base': 100_000_000n,
      ...Object.fromEntries(
        aave.flatMap(chain => [
          [`Aave_${chain}`, 0n],
          [`@${chain}`, 0n],
        ]),
      ),
    },
    instrumentTvls: {},
  });
  const move = (src: AssetPlaceRef, dest: AssetPlaceRef) => ({
    src,
    dest,
    amount: { brand: USDC, value: 20_000_000n },
  });

  t.throws(
    () =>
      vetAllocationPlan(
        permissions,
        targetAllocation,
        { flow: [move('@Base', 'Aave_Arbitrum')] },
        observations,
      ),
    { message: 'pool "Aave_Arbitrum" lives on "Arbitrum", not "Base"' },
    'one deposit into the unapproved Aave_Base',
  );
  t.throws(
    () =>
      vetAllocationPlan(
        permissions,
        harden({ ...targetAllocation, '@Base': 0n, Aave_Base: 20n }),
        { flow: aave.map(chain => move('@Base', `Aave_${chain}`)) },
        harden({
          ...observations,
          balances: { ...observations.balances, Aave_Base: 0n },
        }),
      ),
    { message: /pool "Aave_Arbitrum" lives on "Arbitrum", not "Base"/ },
    'four 20% deposits concentrated into Aave_Base',
  );

  t.notThrows(
    () =>
      vetAllocationPlan(
        permissions,
        targetAllocation,
        {
          flow: [
            { ...move('@Base', '@Arbitrum'), detail: { cctpVersion: 2n } },
            move('@Arbitrum', 'Aave_Arbitrum'),
          ],
        },
        observations,
      ),
    'same-chain deposit after moving the cash',
  );
});

test('allocation operation rejects attested TVL below its mandate', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 120_003_400n,
      Compound_Arbitrum: 80_002_300n,
    },
    instrumentTvls: {
      Aave_Arbitrum: { tvlUsd: 9_999n },
      Compound_Arbitrum: { tvlUsd: 20_000n },
    },
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: 'Compound_Arbitrum',
        amount: { brand: USDC, value: 20_000_550n },
      },
    ],
  };

  t.throws(
    () =>
      vetAllocationPlan(
        harden({
          allocation: { maxWeightBps: 6_000n, minVaultTvlUsd: 10_000n },
        }),
        targetAllocation,
        plan,
        harden(observations),
      ),
    { message: /mandate\.minVaultTvl.*Aave_Arbitrum/ },
  );
});

test('balance observations report all missing places together', t => {
  t.throws(
    () =>
      vetObservationPlaces(
        ['@Base', 'Aave_Base', 'Compound_Base'],
        { flow: [] },
        { balances: { '@Base': 100n, '@Arbitrum': 0n }, instrumentTvls: {} },
      ),
    { message: /missing balance observation.*Aave_Base.*Compound_Base/ },
  );
});

test('Observed holdings account for every location used by the plan', t => {
  const { instrument, shares, movement } = makeMaximumWithdrawalCase();
  const cash = makeHolding({
    place: '@Ethereum',
    kind: 'token',
    amount: 0n,
    valueUusd: 0n,
  });
  const plan = { flow: [movement] };
  const check = (holdings: TypedHoldingDetail[]) =>
    vetObservationPlaces([instrument], plan, makeHoldingObservations(holdings));
  t.notThrows(() => check([shares, cash]));
  t.throws(() => check([shares]), {
    message: /missing balance observation.*@Ethereum/,
  });
  t.throws(() => check([cash]), {
    message: /missing balance observation.*ERC4626_morpho/,
  });
  const extra = { ...cash, place: '@Base' } as const;
  t.notThrows(() => check([shares, cash, extra]));
  t.notThrows(() => check([shares, cash, { ...extra, valueUusd: undefined }]));
  for (const change of [{ amount: 1n }, { valueUusd: 1n }]) {
    t.throws(() => check([shares, cash, { ...extra, ...change }]), {
      message: 'unexpected balance observation for ["@Base"]',
    });
  }
});

test('Observed holdings must not be mistaken for an empty portfolio', t => {
  const { checkAllocation } = makeMaximumWithdrawalCase({
    valueUusd: 100_000_000n,
  });
  t.throws(() => checkAllocation({ Aave_Ethereum: 100n }, { flow: [] }), {
    message:
      /plan final balance exceeds target allocation at "ERC4626_morphoGauntletUsdcRwa_Ethereum"/,
  });
});

for (const [instrument, kind] of [
  ['ERC4626_morphoGauntletUsdcRwa_Ethereum', 'shares'],
  ['Aave_Ethereum', 'principal'],
  ['Compound_Ethereum', 'principal'],
] as const) {
  test(`Portfolio limits use the combined observed values, not raw token quantities (${instrument})`, t => {
    const observations = makeHoldingObservations(
      [
        makeHolding({
          place: instrument,
          kind,
          amount: 123n,
          valueUusd: 40_000_000n,
          balanceUsdc: 1n,
        }),
        makeHolding({
          place: instrument,
          kind: 'claimable-reward',
          amount: 456n,
          valueUusd: 60_000_000n,
          balanceUsdc: 1n,
        }),
      ],
      { [instrument]: { tvlUsd: 80n } },
    );
    for (const balances of [{}, { [instrument]: 2n }]) {
      const withBalances = { ...observations, balances };
      t.notThrows(() =>
        vetPlanAllocation({ [instrument]: 100n }, { flow: [] }, withBalances),
      );
      t.throws(
        () =>
          assertMandateForPlanObservations(
            { allocation: { maxVaultShareBps: 10_000n } },
            { [instrument]: 100n },
            withBalances,
          ),
        { message: /mandate.maxVaultShare.*portfolio value.*100000000/ },
      );
    }
    t.throws(
      () =>
        vetPlanAllocation(
          { [instrument]: 100n },
          { flow: [] },
          { ...observations, balances: { [instrument]: 100_000_000n } },
        ),
      { message: /aggregate balances must match the balanceUsdc/ },
    );
    t.throws(
      () =>
        vetPlanAllocation(
          { [instrument]: 100n },
          { flow: [] },
          {
            ...observations,
            holdings: observations.holdings!.map(holding => ({
              ...holding,
              valueUusd: undefined,
            })),
          },
        ),
      { message: new RegExp(`missing holding valuation.*${instrument}`) },
    );
  });
}

test('balance observations report all nonzero extra places together', t => {
  t.throws(
    () =>
      vetObservationPlaces(
        ['@Base'],
        { flow: [] },
        {
          balances: { '@Base': 100n, Aave_Base: 1n, Compound_Base: 2n },
          instrumentTvls: {},
        },
      ),
    { message: /unexpected balance observation.*Aave_Base.*Compound_Base/ },
  );
});

test('balance observations require every current and plan place', t => {
  const observations: PlanObservations = {
    balances: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
    instrumentTvls: {},
  };

  for (const missing of ['@Base', 'Aave_Avalanche'] as const) {
    t.throws(
      () =>
        vetObservationPlaces(
          harden([missing, 'Aave_Arbitrum', 'Compound_Arbitrum']),
          harden({ flow: [] }),
          observations,
        ),
      { message: new RegExp(`missing balance observation.*${missing}`) },
    );
  }

  t.throws(
    () =>
      vetObservationPlaces(
        harden(['Aave_Arbitrum']),
        harden({
          flow: [
            {
              src: 'Aave_Arbitrum',
              dest: '@Base',
              amount: { brand: USDC, value: 10n },
            },
          ],
        }),
        harden({
          balances: { Aave_Arbitrum: 100n },
          instrumentTvls: {},
        }),
      ),
    { message: /missing balance observation.*@Base/ },
  );
});

test('balance observations accept extra zero-balance accounts and instruments', t => {
  t.notThrows(() =>
    vetObservationPlaces(
      ['Aave_Arbitrum'],
      { flow: [] },
      {
        balances: { Aave_Arbitrum: 100n, '@Base': 0n, Aave_Base: 0n },
        instrumentTvls: {},
      },
    ),
  );
});

test('balance observations reject a nonzero extra account among zero extras', t => {
  t.throws(
    () =>
      vetObservationPlaces(
        ['Aave_Arbitrum'],
        { flow: [] },
        {
          balances: { Aave_Arbitrum: 100n, '@Base': 1n, Aave_Base: 0n },
          instrumentTvls: {},
        },
      ),
    { message: 'unexpected balance observation for ["@Base"]' },
  );
});

test('plan allocation requires an observation for its destination', t => {
  const detail = {
    observed: { Aave: 120n, Compound: undefined },
    actual: { Aave: 120n, Compound: 80n },
    moveDelta: { Aave: -48n, Compound: 48n },
    calculatedResult: { Aave: 72n, Compound: 48n },
    actualResult: { Aave: 72n, Compound: 128n },
  } as const;
  // The omitted balance makes Compound look 40% (48/120), but it is 64% (128/200).
  const targetAllocation = { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: detail.observed.Aave,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: 'Compound_Arbitrum',
        amount: { brand: USDC, value: detail.moveDelta.Compound },
      },
    ],
  };

  t.deepEqual(
    {
      Aave: detail.observed.Aave + detail.moveDelta.Aave,
      Compound: 0n + detail.moveDelta.Compound,
    },
    detail.calculatedResult,
  );
  t.deepEqual(
    {
      Aave: detail.actual.Aave + detail.moveDelta.Aave,
      Compound: detail.actual.Compound + detail.moveDelta.Compound,
    },
    detail.actualResult,
  );
  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /missing balance observation.*Compound_Arbitrum/,
  });
});

test('plan allocation rejects transient disallowed positions', t => {
  const targetAllocation: TargetAllocation = {
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
  };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 120n,
      Compound_Arbitrum: 80n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: 'USDN',
        amount: { brand: USDC, value: 20n },
      },
      {
        src: 'USDN',
        dest: '@noble',
        amount: { brand: USDC, value: 20n },
      },
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /plan cannot add positions.*USDN/,
  });
});

test('claimRewards cannot hide a supply above the allocation ceiling', t => {
  const planObservations: PlanObservations = {
    balances: {
      '@Arbitrum': 100n,
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: { brand: USDC, value: 100n },
        claimRewards: { tokens: [], minAmounts: [] },
      },
    ],
  };
  t.throws(
    () =>
      vetPlanAllocation(
        { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        plan,
        planObservations,
      ),
    {
      message:
        /claimRewards requires an instrument source and its chain account destination/,
    },
  );
});

test('allocation plan rejects a well-formed reward claim', t => {
  const planObservations: PlanObservations = {
    balances: {
      '@Arbitrum': 0n,
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    instrumentTvls: {},
  };
  t.throws(
    () =>
      vetPlanAllocation(
        { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        {
          flow: [
            {
              src: 'Aave_Arbitrum',
              dest: '@Arbitrum',
              amount: { brand: USDC, value: 0n },
              claimRewards: { tokens: [], minAmounts: [] },
            },
          ],
        },
        planObservations,
      ),
    { message: 'allocation plan does not support claimRewards' },
  );
});

test('allocation plan rejects a reward claim after an ordinary movement', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const planObservations: PlanObservations = {
    balances: {
      '@Arbitrum': 0n,
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 100n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 1n },
      },
      {
        src: 'Compound_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 0n },
        claimRewards: { tokens: [], minAmounts: [] },
      },
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, planObservations), {
    message: 'allocation plan does not support claimRewards',
  });
});

test('plan funding follows declared dependencies, not array order', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
      '@Arbitrum': 0n,
    },
    instrumentTvls: {},
  };
  const amount = { brand: USDC, value: 50n };
  const plan: FundsFlowPlan = {
    flow: [
      { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount },
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount },
    ],
    order: [[0, [1]]],
  };

  t.notThrows(() => vetPlanAllocation(targetAllocation, plan, observations));
});

test('plan vetting uses the execution scheduler dependency semantics', t => {
  const planObservations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 100n,
      '@Arbitrum': 0n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 100n },
      },
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: { brand: USDC, value: 100n },
      },
    ],
    order: [
      [1, [0]],
      [1, []],
    ],
  };
  const schedule = makeSchedule({ taskQty: 2, order: plan.order! });
  t.deepEqual(schedule.ready(), [0]);
  schedule.complete(0);
  t.deepEqual(schedule.ready(), [1]);
  // Execution withdraws before supplying, so Aave never exceeds its initial
  // or target share. Partial-plan validation should use those same dependencies.
  t.notThrows(() =>
    vetPlanAllocation(
      { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
      plan,
      planObservations,
    ),
  );
});

for (const place of ['@Arbitrum', 'Aave_Arbitrum'] as const) {
  test(`allocation plan rejects self-movement at ${place}`, t => {
    t.throws(
      () =>
        vetPlanAllocation(
          { Aave_Arbitrum: 100n },
          {
            flow: [
              {
                src: place,
                dest: place,
                amount: { brand: USDC, value: 1n },
              },
            ],
          },
          {
            balances: { '@Arbitrum': 1n, Aave_Arbitrum: 1n },
            instrumentTvls: {},
          },
        ),
      { message: /allocation plan does not support self-movement/ },
    );
  });
}

test('plan funding rejects unordered producer and consumer', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
      '@Arbitrum': 0n,
    },
    instrumentTvls: {},
  };
  const amount = { brand: USDC, value: 50n };
  const plan: FundsFlowPlan = {
    flow: [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount },
      { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount },
    ],
    order: [],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /unfunded plan movement.*@Arbitrum/,
  });
});

test('plan allocation rejects unsafe partial success among unordered steps', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
      '@Arbitrum': 40n,
    },
    instrumentTvls: {},
  };
  const amount = { brand: USDC, value: 40n };
  const plan: FundsFlowPlan = {
    flow: [
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount },
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount },
    ],
    order: [],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message:
      /plan (final|intermediate) balance exceeds target allocation.*Aave_Arbitrum/,
  });
});

for (const [src, dest] of [
  ['@Arbitrum', '-Arbitrum'],
  ['@agoric', '<Cash>'],
  ['+Arbitrum', '@Arbitrum'],
  ['+agoric', '@agoric'],
  ['<Deposit>', '@agoric'],
  ['@agoric', '+agoric'],
] as const) {
  test(`allocation plan rejects deposit or withdrawal endpoint ${src} -> ${dest}`, t => {
    const targetAllocation = { Aave_Arbitrum: 100n };
    const planObservations: PlanObservations = {
      balances: {
        '@agoric': 100n,
        '@Arbitrum': 100n,
        Aave_Arbitrum: 100n,
      },
      instrumentTvls: {},
    };
    const plan: FundsFlowPlan = {
      flow: [
        {
          src,
          dest,
          amount: { brand: USDC, value: 10n },
        },
      ],
    };
    t.throws(
      () => vetPlanAllocation(targetAllocation, plan, planObservations),
      {
        message: /allocation plan does not support deposit or withdrawal place/,
      },
    );
  });
}

test('allocation plan rejects swap steps', t => {
  const targetAllocation = { Aave_Arbitrum: 100n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100n,
      '@Avalanche': 10n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: '@Avalanche',
        dest: '@Avalanche',
        amount: { brand: USDC, value: 10n },
        swap: {
          provider: '1inch',
          tokenIn: '0x0000000000000000000000000000000000000abc',
          amountIn: 10n,
          flags: 0n,
          executor: '0x2222222222222222222222222222222222222222',
          srcReceiver: '0x3333333333333333333333333333333333333333',
          data: '0xdeadbeef',
        },
      },
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /allocation plan does not support swap/,
  });
});

test('allocation plan rejects cyclic dependencies', t => {
  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
      '@Arbitrum': 0n,
    },
    instrumentTvls: {},
  };
  const amount = { brand: USDC, value: 50n };
  const plan: FundsFlowPlan = {
    flow: [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount },
      { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount },
    ],
    order: [
      [0, [1]],
      [1, [0]],
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /dependency cycle/i,
  });
});

test('allocation check is independent of off-chain observations', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: {
          maxWeightBps: 6_000n,
          minVaultTvlUsd: 30_000_000n,
          maxVaultShareBps: 100n,
        },
      }),
      allocation,
    ),
  );
});

test('plan observations apply global limits to every instrument', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: {
          maxWeightBps: 6_000n,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 500n,
        },
      }),
      allocation,
      staticObservations,
    ),
  );
});

for (const { title, permissions, evidence, error } of [
  {
    title: 'minimum vault TVL',
    permissions: {
      allocation: { minVaultTvlUsd: 20_000_001n },
    },
    evidence: staticObservations,
    error: /mandate\.minVaultTvl.*Aave_Base/,
  },
  {
    title: 'missing instrument data',
    permissions: {
      allocation: { minVaultTvlUsd: 1n },
    },
    evidence: { ...staticObservations, instrumentTvls: {} },
    error: /mandate\.instrumentData\.missing.*Aave_Base/,
  },
  {
    title: 'maximum vault share',
    permissions: {
      allocation: { maxVaultShareBps: 100n },
    },
    evidence: staticObservations,
    error: /mandate\.maxVaultShare.*Aave_Base/,
  },
] as const) {
  test(`plan observations reject ${title}`, t => {
    t.throws(
      () =>
        assertMandateForPlanObservations(
          harden(permissions),
          allocation,
          harden(evidence),
        ),
      { message: error },
    );
  });
}

test('global mandate rejects maximum weight for each non-cash position', t => {
  t.throws(
    () =>
      assertMandateForAllocation(
        harden({
          allocation: { maxWeightBps: 5_999n },
        }),
        allocation,
      ),
    { message: /mandate\.maxWeight.*Aave_Base/ },
  );
});

test('cash is exempt from maximum weight', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: { maxWeightBps: 0n },
      }),
      harden({ '@Base': 100n }),
    ),
  );
});

test('cash is exempt from observation-dependent limits', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: { minVaultTvlUsd: 1n, maxVaultShareBps: 0n },
      }),
      harden({ '@Base': 100n }),
      harden({
        balances: { '@Base': 1_000_000n },
        instrumentTvls: {},
      }),
    ),
  );
});

test('zero-weight vaults are exempt from observation-dependent limits', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: { minVaultTvlUsd: 30_000_000n, maxVaultShareBps: 0n },
      }),
      harden({ '@Base': 100n, Aave_Base: 0n, Compound_Base: 0n }),
      harden({
        balances: { '@Base': 1_000_000n },
        instrumentTvls: { Aave_Base: { tvlUsd: 20_000_000n } },
      }),
    ),
  );
});

test('global minimum TVL rejects a later applicable instrument', t => {
  t.throws(
    () =>
      assertMandateForPlanObservations(
        harden({ allocation: { minVaultTvlUsd: 30_000_000n } }),
        harden({ Aave_Base: 50n, Compound_Base: 50n }),
        harden({
          ...staticObservations,
          instrumentTvls: {
            Aave_Base: { tvlUsd: 50_000_000n },
            Compound_Base: { tvlUsd: 20_000_000n },
          },
        }),
      ),
    { message: /mandate\.minVaultTvl.*Compound_Base/ },
  );
});

// AGO-1521: unrelated dust must not force a cross-chain withdrawal.
test('plan allocation permits unrelated zero-target dust', t => {
  const observations: PlanObservations = {
    balances: {
      Aave_Optimism: 17n,
      Compound_Base: 100_000_000n,
      '@Base': 0n,
      Aave_Base: 0n,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Compound_Base',
        dest: '@Base',
        amount: { brand: USDC, value: 2_000_000n },
      },
      {
        src: '@Base',
        dest: 'Aave_Base',
        amount: { brand: USDC, value: 2_000_000n },
      },
    ],
  };
  t.notThrows(() =>
    vetPlanAllocation(
      { Aave_Optimism: 0n, Aave_Base: 2n, Compound_Base: 98n },
      plan,
      observations,
    ),
  );
});

for (const [name, aave, compound, optimism, accepted] of [
  ['exact boundary', 1_000_000n, 0n, 0n, true],
  ['over boundary', 1_000_001n, 0n, 0n, false],
  ['shared budget', 500_000n, 500_000n, 0n, true],
  ['shared overflow', 500_000n, 500_001n, 0n, false],
  ['separate chains', 1_000_000n, 0n, 1_000_000n, true],
  ['no cross-chain credit', 1_000_001n, 0n, 500_000n, false],
] as const) {
  test(`final allocation divergence: ${name}`, t => {
    // Omitted instruments have zero target. Deficits cannot offset excess.
    const check = () =>
      vetPlanAllocation(
        { '@Base': 1n },
        { flow: [] },
        {
          balances: {
            '@Base': 100_000_000n,
            Aave_Base: aave,
            Compound_Base: compound,
            Aave_Optimism: optimism,
          },
          instrumentTvls: {},
        },
      );
    if (accepted) t.notThrows(check);
    else
      t.throws(check, {
        message: /plan final balance exceeds target allocation/,
      });
  });
}

test('divergence budget preserves fractional target ceilings', t => {
  // Total 3,000,001 / 2 leaves a fractional micro-USDC ceiling.
  const check = (balance: bigint) =>
    vetPlanAllocation(
      { Aave_Base: 1n, '@Base': 1n },
      { flow: [] },
      {
        balances: { Aave_Base: balance, '@Base': 3_000_001n - balance },
        instrumentTvls: {},
      },
    );
  t.notThrows(() => check(2_500_000n));
  t.throws(() => check(2_500_001n), {
    message: /plan final balance exceeds target allocation/,
  });
});

test('dust allowance does not admit a zero-total allocation', t => {
  t.throws(
    () =>
      vetPlanAllocation(
        { Aave_Base: 0n },
        { flow: [] },
        { balances: { Aave_Base: 1n }, instrumentTvls: {} },
      ),
    { message: /plan target allocation has zero total/ },
  );
});

for (const initialBalance of [0n, 1_000_000n, 2_000_000n]) {
  test(`partial failures cannot ratchet zero-target exposure from ${initialBalance}`, t => {
    const plan: FundsFlowPlan = {
      flow: [
        { src: '@Base', dest: 'Aave_Base', amount: { brand: USDC, value: 1n } },
        {
          src: 'Aave_Base',
          dest: '@Base',
          amount: { brand: USDC, value: initialBalance + 1n },
        },
      ],
    };
    // Full success drains the position. Failure after the supply would instead
    // increase its observed initial balance, even when the increase is just 1 micro-USDC.
    t.throws(
      () =>
        vetPlanAllocation({ '@Base': 1n, Aave_Base: 0n }, plan, {
          balances: { '@Base': 10_000_000n, Aave_Base: initialBalance },
          instrumentTvls: {},
        }),
      { message: /plan intermediate balance exceeds target allocation/ },
    );
  });
}

test('final dust allowance cannot authorize a new above-target supply', t => {
  t.throws(
    () =>
      vetPlanAllocation(
        { Aave_Base: 1n, '@Base': 1n },
        {
          flow: [
            {
              src: '@Base',
              dest: 'Aave_Base',
              amount: { brand: USDC, value: 11_000_000n },
            },
          ],
        },
        {
          balances: { '@Base': 20_000_000n, Aave_Base: 0n },
          instrumentTvls: {},
        },
      ),
    { message: /plan intermediate balance exceeds target allocation/ },
  );
});

const additiveWithdrawCases: [string, WithdrawParams | undefined][] = [
  ['absent', undefined],
  ['empty', {}],
  ['false max', { max: false }],
  ['true max', { max: true }],
];

test('A maximum withdrawal removes share exposure, not just its proceeds minimum', t => {
  const { checkAllocation } = makeMaximumWithdrawalCase({
    valueUusd: 100_000_000n,
    minimumProceeds: 0n,
  });
  t.notThrows(() => checkAllocation({ Aave_Ethereum: 100n }));
});

test('Redeeming some shares leaves their remaining value at the source', t => {
  const { movement, checkAllocation } = makeMaximumWithdrawalCase({
    shareQuantity: 50n,
    valueUusd: 100_000_000n,
  });
  t.throws(
    () =>
      checkAllocation(
        { Aave_Ethereum: 100n },
        { flow: [{ ...movement, withdraw: { amountOfShares: 20n } }] },
      ),
    { message: /plan final balance exceeds target allocation.*60000000/ },
  );
});

test('A full exit can be followed by investing cash already in the account', t => {
  const { shares, movement, checkAllocation } = makeMaximumWithdrawalCase({
    valueUusd: 100_000_000n,
    minimumProceeds: 0n,
  });
  const cash = 20_000_000n;
  const withCash = makeHoldingObservations([
    shares,
    makeHolding({
      place: '@Ethereum',
      kind: 'token',
      amount: cash,
      valueUusd: cash,
    }),
    makeHolding({
      place: 'Aave_Ethereum',
      kind: 'principal',
      amount: 0n,
      valueUusd: 0n,
    }),
  ]);
  const plan: FundsFlowPlan = {
    flow: [
      movement,
      {
        src: '@Ethereum',
        dest: 'Aave_Ethereum',
        amount: { brand: USDC, value: cash },
      },
    ],
  };
  // The investment uses existing USDC, without relying on redemption proceeds.
  t.notThrows(() => checkAllocation({ Aave_Ethereum: 100n }, plan, withCash));
});

test('Cash movements spend observed USDC, not other holdings’ USD value', t => {
  const cash = makeHolding({
    place: '@Ethereum',
    kind: 'token',
    amount: 20_000_000n,
    valueUusd: 20_000_000n,
  });
  const reward: TypedHoldingDetail = {
    ...makeHolding({
      place: '@Ethereum',
      kind: 'claimed-reward',
      amount: 100_000_000n,
      valueUusd: 100_000_000n,
    }),
    tokenId: holdingTokens.reward,
  };
  const transfer = (value: bigint): MovementDesc => ({
    src: '@Ethereum',
    dest: '@Arbitrum',
    amount: { brand: USDC, value },
  });
  const check = (
    plan: FundsFlowPlan,
    cashHolding = cash,
    getUsdcTokenId = (): string | undefined => holdingTokens.usdc,
  ) =>
    vetPlanAllocation(
      {},
      plan,
      makeHoldingObservations([cashHolding, reward]),
      getUsdcTokenId,
    );

  t.notThrows(() => check({ flow: [transfer(20_000_000n)] }));
  t.throws(() => check({ flow: [transfer(21_000_000n)] }), {
    message: /unfunded USDC movement.*20000000.*21000000/,
  });
  // Both sequential and concurrent transfers consume the same raw cash budget.
  for (const order of [undefined, []]) {
    t.throws(
      () =>
        check({ flow: [transfer(15_000_000n), transfer(15_000_000n)], order }),
      { message: /unfunded USDC movement/ },
    );
  }
  t.throws(
    () =>
      check(
        { flow: [transfer(1n)] },
        { ...cash, tokenId: holdingTokens.otherVault },
      ),
    { message: /requires one observed USDC holding/ },
  );
  t.throws(
    () => check({ flow: [transfer(1n)] }, { ...cash, valueUusd: 19_000_000n }),
    { message: /requires one-for-one USDC valuation/ },
  );
  t.throws(() => check({ flow: [transfer(1n)] }, cash, () => undefined), {
    message: /no configured USDC token/,
  });
});

for (const [src, tokenId] of [
  ['@noble', 'uusdc'],
  ['@agoric', 'ibc/AGORIC_USDC_DENOM'],
] as const) {
  test(`${src} cash movements spend observed USDC`, t => {
    const observations = makeHoldingObservations([
      {
        place: src,
        kind: 'token',
        tokenId,
        amount: 20_000_000n,
        valueUusd: 20_000_000n,
      },
    ]);
    const plan: FundsFlowPlan = {
      flow: [
        {
          src,
          dest: '@Ethereum',
          amount: { brand: USDC, value: 10_000_000n },
        },
      ],
    };
    t.notThrows(() =>
      vetPlanAllocation(
        {},
        plan,
        observations,
        src === '@agoric' ? () => tokenId : undefined,
      ),
    );
  });
}

for (const investment of ['Aave_Ethereum', 'Compound_Ethereum'] as const) {
  test(`Observing rewards does not establish how much is already invested (${investment})`, t => {
    const cash = 20_000_000n;
    const observations = makeHoldingObservations([
      makeHolding({
        place: '@Ethereum',
        kind: 'token',
        amount: cash,
        valueUusd: cash,
      }),
      makeHolding({
        place: investment,
        kind: 'claimable-reward',
        amount: 0n,
        valueUusd: 0n,
      }),
    ]);
    const plan: FundsFlowPlan = {
      flow: [
        {
          src: '@Ethereum',
          dest: investment,
          amount: { brand: USDC, value: cash },
        },
      ],
    };
    t.throws(
      () =>
        vetPlanAllocation(
          { [investment]: 100n },
          plan,
          observations,
          () => holdingTokens.usdc,
        ),
      { message: new RegExp(`missing.*${investment}`) },
    );
  });

  test(`A full exit cannot treat unobserved investments as empty (${investment})`, t => {
    const { instrument, shares, movement } = makeMaximumWithdrawalCase();
    const observations = makeHoldingObservations([
      shares,
      makeHolding({
        place: '@Ethereum',
        kind: 'token',
        amount: 0n,
        valueUusd: 0n,
      }),
      // This is an existing investment. Only its rewards have been observed;
      // its principal could still exceed the proposed zero allocation.
      makeHolding({
        place: investment,
        kind: 'claimable-reward',
        amount: 0n,
        valueUusd: 0n,
      }),
    ]);
    const plan = { flow: [movement] };
    const withLegacyBalances: PlanObservations = {
      ...observations,
      holdings: observations.holdings!.map(holding => ({
        ...holding,
        balanceUsdc: holding.valueUusd!,
      })),
      balances: {
        [instrument]: shares.valueUusd!,
        '@Ethereum': 0n,
        [investment]: 0n,
      },
    };
    for (const evidence of [observations, withLegacyBalances]) {
      t.throws(
        () => {
          vetObservationPlaces(
            [instrument, investment, '@Ethereum'],
            plan,
            evidence,
          );
          vetPlanAllocation({ [instrument]: 100n }, plan, evidence);
        },
        { message: new RegExp(`missing.*${investment}`) },
      );
    }
  });
}

test('Redemption binds observed shares to the configured vault', t => {
  const { instrument, shares, observations, movement } =
    makeMaximumWithdrawalCase({ shareQuantity: 50n });
  const plan = {
    flow: [{ ...movement, shareWithdrawals: { shares: 999n } }],
  };
  const configuredVault = () => holdingTokens.vault;
  const vet = (
    submitted: FundsFlowPlan = plan,
    evidence = observations,
    getVaultAddress: () => EvmAddress | undefined = configuredVault,
  ) =>
    vetAllocationPlan(
      { allocation: {} },
      { [instrument]: 100n },
      submitted,
      evidence,
      { getVaultAddress },
    );
  t.deepEqual(vet(), {
    commitNow: true,
    shareWithdrawals: {
      0: { src: instrument, vaultAddress: holdingTokens.vault, shares: 50n },
    },
  });
  t.deepEqual(
    vet({ flow: [{ ...movement, withdraw: { amountOfShares: 20n } }] }),
    {
      commitNow: true,
      shareWithdrawals: {
        0: { src: instrument, vaultAddress: holdingTokens.vault, shares: 20n },
      },
    },
  );
  t.throws(
    () =>
      vet(
        plan,
        makeHoldingObservations([
          { ...shares, tokenId: holdingTokens.otherVault },
        ]),
      ),
    { message: /observed share token.*does not match configured vault/ },
  );
  t.throws(() => vet(plan, observations, () => undefined), {
    message: /no configured vault/,
  });
  t.throws(
    () => vet({ flow: [{ ...movement, amount: { brand: USDC, value: 1n } }] }),
    {
      message:
        /share redemption cannot yet enforce a positive proceeds minimum/,
    },
  );
});

test('Maximum withdrawal requires observed shares, even with legacy balances', t => {
  const { instrument, movement } = makeMaximumWithdrawalCase();
  const observations: PlanObservations = {
    balances: { [instrument]: 50n, '@Ethereum': 0n },
    instrumentTvls: {},
  };
  t.throws(
    () =>
      vetAllocationPlan(
        { allocation: {} },
        { [instrument]: 100n },
        { flow: [movement] },
        observations,
        { getVaultAddress: () => holdingTokens.vault },
      ),
    { message: /share redemption requires one observed share holding/ },
  );
});

test('Only minimum redemption proceeds count toward final portfolio value', t => {
  const { shares, movement, checkAllocation } = makeMaximumWithdrawalCase({
    valueUusd: 100_000_000n,
    minimumProceeds: 0n,
  });
  const withOtherPosition = makeHoldingObservations([
    shares,
    makeHolding({
      place: 'Aave_Ethereum',
      kind: 'principal',
      amount: 100_000_000n,
      valueUusd: 100_000_000n,
    }),
  ]);
  const target = { Aave_Ethereum: 50n, Compound_Ethereum: 50n };
  t.throws(
    () => checkAllocation(target, { flow: [movement] }, withOtherPosition),
    { message: /plan final balance exceeds target allocation.*Aave_Ethereum/ },
  );
  t.notThrows(() =>
    checkAllocation(
      target,
      { flow: [{ ...movement, amount: { brand: USDC, value: 100_000_000n } }] },
      withOtherPosition,
    ),
  );
});

test('An empty share holding can meet only zero withdrawal minimums', t => {
  const { instrument, movement, checkAllocation } = makeMaximumWithdrawalCase({
    shareQuantity: 0n,
    valueUusd: 0n,
    minimumProceeds: 0n,
  });
  t.notThrows(() => checkAllocation({ [instrument]: 100n }));
  t.throws(
    () =>
      checkAllocation(
        { [instrument]: 100n },
        { flow: [{ ...movement, amount: { brand: USDC, value: 1n } }] },
      ),
    { message: /empty share holding cannot meet proceeds minimum/ },
  );
});

test('Share withdrawals cannot exceed the observed shares', t => {
  const { instrument, shares, observations, movement, checkAllocation } =
    makeMaximumWithdrawalCase({ shareQuantity: 50n });
  t.throws(
    () =>
      checkAllocation({ [instrument]: 100n }, { flow: [movement, movement] }),
    { message: /unfunded share withdrawal.*50/ },
  );
  t.throws(
    () =>
      checkAllocation(
        { [instrument]: 100n },
        { flow: [{ ...movement, withdraw: { amountOfShares: 51n } }] },
      ),
    { message: /requested shares.*51.*observed shares.*50/ },
  );
  for (const holdings of [
    [{ ...shares, kind: 'principal' as const }],
    [
      shares,
      {
        ...shares,
        tokenId: holdingTokens.otherVault,
      },
    ],
  ]) {
    t.throws(
      () =>
        checkAllocation(
          { [instrument]: 100n },
          { flow: [movement] },
          { ...observations, holdings },
        ),
      { message: /share redemption requires one observed share holding/ },
    );
  }
});

test('A maximum share withdrawal leaves reward exposure at the source', t => {
  const { instrument, shares, movement, checkAllocation } =
    makeMaximumWithdrawalCase();
  t.throws(
    () =>
      checkAllocation(
        { Aave_Ethereum: 100n },
        { flow: [movement] },
        makeHoldingObservations([
          shares,
          makeHolding({
            place: instrument,
            kind: 'claimable-reward',
            amount: 20n,
            valueUusd: 20_000_000n,
          }),
        ]),
      ),
    { message: /plan final balance exceeds target allocation.*20000000/ },
  );
});

test('Maximum Morpho withdrawals target the position’s own chain account', t => {
  const { instrument, movement, checkAllocation } = makeMaximumWithdrawalCase();
  t.throws(
    () =>
      checkAllocation(
        { [instrument]: 100n },
        { flow: [{ ...movement, dest: '@Arbitrum' }] },
      ),
    { message: /lives on "Ethereum", not "Arbitrum"/ },
  );
  for (const [src, dest] of [
    [instrument, 'Aave_Ethereum'],
    ['Aave_Ethereum', '@Ethereum'],
  ] as const) {
    t.throws(
      () =>
        checkAllocation(
          { [instrument]: 100n, Aave_Ethereum: 0n },
          { flow: [{ ...movement, src, dest }] },
        ),
      {
        message:
          /share redemption requires a Morpho source and its chain account destination/,
      },
    );
  }
  t.throws(
    () =>
      checkAllocation(
        { [instrument]: 100n },
        {
          flow: [
            {
              ...movement,
              claimRewards: { tokens: [], minAmounts: [] },
            },
          ],
        },
      ),
    { message: /share redemption cannot also claim rewards/ },
  );
});

for (const [label, withdraw] of additiveWithdrawCases) {
  test(`withdraw is additive to exact-amount allocation validation: ${label}`, t => {
    const plan: FundsFlowPlan = harden({
      flow: [
        {
          src: 'Aave_Base',
          dest: '@Base',
          amount: { brand: USDC, value: 100_000_000n },
          ...(withdraw === undefined ? {} : { withdraw }),
        },
      ],
    });
    t.notThrows(() =>
      vetPlanAllocation({ '@Base': 1n }, plan, {
        balances: { Aave_Base: 100_000_000n, '@Base': 0n },
        instrumentTvls: {},
      }),
    );
    t.deepEqual(
      plan.flow[0]!.withdraw,
      withdraw,
      'validation leaves the options intact',
    );
  });
}

test('max metadata does not project a full exit before contract support', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Base',
        dest: '@Base',
        amount: { brand: USDC, value: 50_000_000n },
        withdraw: { max: true },
      },
    ],
  };
  t.throws(
    () =>
      vetPlanAllocation({ '@Base': 1n }, plan, {
        balances: { Aave_Base: 100_000_000n, '@Base': 0n },
        instrumentTvls: {},
      }),
    { message: /plan final balance exceeds target allocation/ },
  );
});

test('withdraw options do not reserve the source or change exact downstream funding', t => {
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Base',
        dest: '@Base',
        amount: { brand: USDC, value: 50_000_000n },
        withdraw: { max: true },
      },
      {
        src: 'Aave_Base',
        dest: '@Base',
        amount: { brand: USDC, value: 50_000_000n },
        withdraw: { max: false },
      },
    ],
  };
  t.notThrows(() =>
    vetPlanAllocation({ '@Base': 1n }, plan, {
      balances: { Aave_Base: 100_000_000n, '@Base': 0n },
      instrumentTvls: {},
    }),
  );
  const unfunded: FundsFlowPlan = {
    flow: [
      plan.flow[0]!,
      {
        src: '@Base',
        dest: 'Compound_Base',
        amount: { brand: USDC, value: 60_000_000n },
      },
    ],
  };
  t.throws(
    () =>
      vetPlanAllocation(
        { Aave_Base: 1n, Compound_Base: 1n, '@Base': 1n },
        unfunded,
        {
          balances: { Aave_Base: 100_000_000n, '@Base': 0n, Compound_Base: 0n },
          instrumentTvls: {},
        },
      ),
    { message: /unfunded plan movement/ },
  );
});

test('withdraw options introduce no protocol-specific admission rule', t => {
  t.notThrows(() =>
    vetPlanAllocation(
      { '@Ethereum': 1n },
      {
        flow: [
          {
            src: 'ERC4626_vaultU2_Ethereum',
            dest: '@Ethereum',
            amount: { brand: USDC, value: 100n },
            withdraw: { max: true },
          },
        ],
      },
      {
        balances: { ERC4626_vaultU2_Ethereum: 100n, '@Ethereum': 0n },
        instrumentTvls: {},
      },
    ),
  );
});
