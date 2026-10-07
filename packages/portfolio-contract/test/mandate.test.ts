/** @file Tests for delegated portfolio mandates and plan evidence. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, type NatValue } from '@agoric/ertp';
import { fc, testProp } from '@fast-check/ava';
import type {
  AssetPlaceRef,
  FundsFlowPlan,
  InstrumentId,
  PlanObservations,
  PortfolioBalancePlaceRef,
  TargetAllocation,
} from '@agoric/portfolio-api';
import { chainOf, isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import {
  assertMandateForAllocation,
  assertMandateForPlanObservations,
  vetAllocationPlan,
  vetObservationPlaces,
  vetPlanAllocation,
} from '../src/mandate.ts';
import type { MovementDesc } from '../src/type-guards-steps.ts';

const { brand: USDC } = makeIssuerKit('USDC');

const observations = harden({
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
    message: /plan exceeds target allocation.*Aave_Arbitrum/,
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
    { message: /plan exceeds target allocation.*Compound_Arbitrum/ },
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

  // 20_000_000 leaves Aave at 100_003_400, which is 550 above 50%.
  t.throws(
    () =>
      vetPlanAllocation(targetAllocation, planFor(20_000_000n), observations),
    { message: /plan exceeds target allocation.*Aave_Arbitrum/ },
  );
  t.notThrows(() =>
    vetPlanAllocation(targetAllocation, planFor(20_000_550n), observations),
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
        harden({ observations, signature: null }),
      ),
    { message: /plan exceeds target allocation.*Compound_Arbitrum/ },
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
        harden({ observations, signature: null }),
      ),
    { message: /mandate\.minVaultTvl.*Aave_Arbitrum/ },
  );
});

test('balance observations exactly cover current and plan places', t => {
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

  t.throws(
    () =>
      vetObservationPlaces(
        harden(['Aave_Arbitrum']),
        harden({ flow: [] }),
        harden({
          balances: { Aave_Arbitrum: 100n, '@Base': 0n },
          instrumentTvls: {},
        }),
      ),
    { message: /unexpected balance observation.*@Base/ },
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
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 20n },
      },
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /planner cannot add positions.*USDN/,
  });
});

test('claimRewards amount does not affect allocation ceilings', t => {
  const detail = {
    observed: { Aave: 100n, Compound: 100n },
    // claimDelta is zero because claims do not move USDC.
    claimDelta: { Aave: 0n, Compound: 0n },
    moveDelta: { Aave: 1n, Compound: -1n },
    result: { Aave: 101n, Compound: 99n },
    ceiling50pct: { Aave: 100n, Compound: 100n },
  } as const;
  const { observed, claimDelta, moveDelta, result, ceiling50pct } = detail;
  // result = observed + claimDelta + moveDelta
  t.deepEqual(
    {
      Aave: observed.Aave + claimDelta.Aave + moveDelta.Aave,
      Compound: observed.Compound + claimDelta.Compound + moveDelta.Compound,
    },
    result,
  );
  t.true(result.Aave > ceiling50pct.Aave);

  const targetAllocation = { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n };
  const observations: PlanObservations = {
    balances: {
      Aave_Arbitrum: observed.Aave,
      Compound_Arbitrum: observed.Compound,
    },
    instrumentTvls: {},
  };
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: 'Aave_Arbitrum',
        dest: '@Arbitrum',
        amount: { brand: USDC, value: 100n },
        claimRewards: { tokens: [], minAmounts: [] },
      },
      {
        src: 'Compound_Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: { brand: USDC, value: -moveDelta.Compound },
      },
    ],
  };

  t.throws(() => vetPlanAllocation(targetAllocation, plan, observations), {
    message: /plan exceeds target allocation.*Aave_Arbitrum/,
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
    message: /plan exceeds target allocation.*Aave_Arbitrum/,
  });
});

test('customer-routed plan rejects swap steps', t => {
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
    message: /customer-routed plan does not support swap/,
  });
});

test('customer-routed plan rejects cyclic dependencies', t => {
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
      observations,
    ),
  );
});

for (const { title, permissions, evidence, error } of [
  {
    title: 'minimum vault TVL',
    permissions: {
      allocation: { minVaultTvlUsd: 20_000_001n },
    },
    evidence: observations,
    error: /mandate\.minVaultTvl.*Aave_Base/,
  },
  {
    title: 'missing instrument data',
    permissions: {
      allocation: { minVaultTvlUsd: 1n },
    },
    evidence: { ...observations, instrumentTvls: {} },
    error: /mandate\.instrumentData\.missing.*Aave_Base/,
  },
  {
    title: 'maximum vault share',
    permissions: {
      allocation: { maxVaultShareBps: 100n },
    },
    evidence: observations,
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
          ...observations,
          instrumentTvls: {
            Aave_Base: { tvlUsd: 50_000_000n },
            Compound_Base: { tvlUsd: 20_000_000n },
          },
        }),
      ),
    { message: /mandate\.minVaultTvl.*Compound_Base/ },
  );
});
