/** @file Tests for the planner exo and customer-routed plan validation. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, type NatValue } from '@agoric/ertp';
import { fc, testProp } from '@fast-check/ava';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import { PortfolioPlannerAgent } from '@agoric/portfolio-api';
import type {
  AssetPlaceRef,
  FundsFlowPlan,
  InstrumentId,
  PlanObservations,
  PortfolioBalancePlaceRef,
  TargetAllocation,
} from '@agoric/portfolio-api';
import { chainOf, isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import type { PortfolioDelegationClient } from '../src/delegation.exo.ts';
import {
  vetAllocationPlan,
  vetObservationPlaces,
  vetPlanAllocation,
} from '../src/mandate.ts';
import { preparePlanner } from '../src/planner.exo.ts';
import {
  type PortfolioKit,
  preparePortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  makeOfferArgsShapes,
  type MovementDesc,
} from '../src/type-guards-steps.ts';
import { makeStorageTools } from './supports.ts';

const { brand: USDC } = makeIssuerKit('USDC');

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

// TODO: Complement safety with liveness: for every mandate-compliant target
// allocation reachable from arbitrary initial balances, generate at least one
// accepted plan that reaches it.
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

test('planner exo resolvePlan method', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    ...({} as any),
  });
  const aPortfolio = makePortfolio({ portfolioId: 1 });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  });

  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ USDN: 100n });

  {
    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log('targetAllocation', aPortfolio.reader.getTargetAllocation(), {
      policyVersion,
      rebalanceCount,
    });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 0 },
      'version 1 after setTargetAllocation',
    );
  }

  const portfolioId = 0;
  const amount = { brand: USDC, value: 100n };

  {
    const { stepsP, flowId } = aPortfolio.manager.startFlow({
      type: 'rebalance',
    });

    const plan: MovementDesc[] = [
      { src: '+agoric', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDN', amount },
    ];

    t.throws(() => planner.resolvePlan(portfolioId, flowId, plan, 0, 0), {
      message: /expected policyVersion 1; got 0/,
    });

    planner.resolvePlan(portfolioId, flowId, plan, 1, 0);
    t.deepEqual(await vt.when(stepsP), plan);

    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 1 },
      'rebalanceCount 1 after .resolvePlan(plan, ...)',
    );
  }

  {
    const { stepsP, flowId } = aPortfolio.manager.startFlow({
      type: 'rebalance',
    });

    const mockRebalancePlan = [];
    t.notThrows(
      () => planner.resolvePlan(portfolioId, flowId, mockRebalancePlan, 1, 1),
      'planner may rebalance >1 times at same policyVersion',
    );

    t.deepEqual(await vt.when(stepsP), mockRebalancePlan);

    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 2 },
      'rebalanceCount 2 after second resolvePlan',
    );
  }

  {
    const { flowId } = aPortfolio.manager.startFlow({
      type: 'rebalance',
    });

    const newPositionPlan: MovementDesc[] = [
      { src: '@noble', dest: 'Aave_Arbitrum', amount },
    ];
    t.throws(
      () => planner.resolvePlan(portfolioId, flowId, newPositionPlan, 1, 2),
      { message: /planner cannot add positions/i },
    );
  }
});

test('planner rejects delegated plans that fail observation-time validation', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);
  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  let delegationClient: PortfolioDelegationClient | undefined;
  let stepsP: unknown;
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller: board.getReadonlyMarshaller(),
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    zcf: {
      makeEmptySeatKit: () => ({ zcfSeat: null }),
    } as any,
    executePlan: (_seat, _offerArgs, _kit, _flowDetail, startedFlow) => {
      if (!startedFlow) throw Error('expected started flow');
      stepsP = startedFlow.stepsP;
      return vt.asVow(() => undefined);
    },
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(client) {
      delegationClient = client;
      return Promise.resolve();
    },
    ...({} as any),
  });
  const portfolio = makePortfolio({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  portfolio.manager.setTargetAllocation({ Aave_Base: 100n });
  await portfolio.manager.grantDelegation(
    'agoric1plannerobservationtest',
    harden({
      allocation: { maxVaultShareBps: 100n },
    }),
  );
  await eventLoopIteration();
  assert(delegationClient);
  const before = { policyVersion: 2, rebalanceCount: 0 };
  const flowKey = delegationClient.setTargetAllocation({
    targetAllocation: { Aave_Base: 100n },
    syncState: {
      policyVersion: before.policyVersion,
      rebalanceCount: before.rebalanceCount,
    },
  });
  const flowId = Number(flowKey.slice('flow'.length));
  await eventLoopIteration();
  const afterFlow = await getPortfolioStatus(1);
  const planner = preparePlanner(zone, {
    getPortfolioPlanner: () => portfolio.planner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  })();
  const plan: MovementDesc[] = [];
  const excessive = harden({
    balances: { Aave_Base: 1_000_000_000_000n },
    instrumentTvls: {
      Aave_Base: { tvlUsd: 20_000_000n },
    },
  });

  t.notThrows(() =>
    planner.resolvePlan(
      1,
      flowId,
      plan,
      afterFlow.policyVersion,
      afterFlow.rebalanceCount,
      excessive,
    ),
  );
  await t.throwsAsync(vt.when(stepsP as any), {
    message: /mandate\.maxVaultShare.*Aave_Base/,
  });
  t.is(
    (await getPortfolioStatus(1)).rebalanceCount,
    afterFlow.rebalanceCount + 1,
  );

  const beforeRace = await getPortfolioStatus(1);
  const racedFlowKey = delegationClient.setTargetAllocation({
    targetAllocation: { Aave_Base: 100n },
    syncState: {
      policyVersion: beforeRace.policyVersion,
      rebalanceCount: beforeRace.rebalanceCount,
    },
  });
  const racedFlowId = Number(racedFlowKey.slice('flow'.length));
  await eventLoopIteration();
  portfolio.manager.setTargetAllocation({ Aave_Base: 100n });
  const afterPolicyChange = await getPortfolioStatus(1);
  const sufficient = harden({
    balances: { Aave_Base: 1_000_000_000_000n },
    instrumentTvls: {
      Aave_Base: { tvlUsd: 200_000_000n },
    },
  });

  t.notThrows(() =>
    planner.resolvePlan(
      1,
      racedFlowId,
      plan,
      afterPolicyChange.policyVersion,
      afterPolicyChange.rebalanceCount,
      sufficient,
    ),
  );
  await t.throwsAsync(vt.when(stepsP as any), {
    message: /mandate\.policyVersion\.changed/,
  });
  t.is(
    (await getPortfolioStatus(1)).rebalanceCount,
    afterPolicyChange.rebalanceCount + 1,
  );
});

test('planner accepts already-committed delegated target allocation after policy race', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);
  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  let delegationClient: PortfolioDelegationClient | undefined;
  let stepsP: unknown;
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller: board.getReadonlyMarshaller(),
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    zcf: {
      makeEmptySeatKit: () => ({ zcfSeat: null }),
    } as any,
    executePlan: (_seat, _offerArgs, _kit, _flowDetail, startedFlow) => {
      if (!startedFlow) throw Error('expected started flow');
      stepsP = startedFlow.stepsP;
      return vt.asVow(() => undefined);
    },
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(client) {
      delegationClient = client;
      return Promise.resolve();
    },
    ...({} as any),
  });
  const portfolio = makePortfolio({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  portfolio.manager.setTargetAllocation({ Aave_Base: 100n });
  const { policyVersion } = await portfolio.manager.grantDelegation(
    'agoric1plannerimmediatecommit',
    harden({
      allocation: true,
    }),
  );
  await eventLoopIteration();
  assert(delegationClient);
  const beforeFlow = await getPortfolioStatus(1);
  const flowKey = delegationClient.setTargetAllocation({
    targetAllocation: { Aave_Base: 100n },
    syncState: {
      policyVersion,
      rebalanceCount: beforeFlow.rebalanceCount,
    },
  });
  const flowId = Number(flowKey.slice('flow'.length));
  await eventLoopIteration();

  const afterCommit = await getPortfolioStatus(1);
  t.like(afterCommit.flowsRunning?.[flowKey], {
    initiatingOperation: {
      type: 'setTargetAllocation',
      status: 'ok',
    },
  });

  portfolio.manager.setTargetAllocation({ Aave_Base: 100n });
  const afterPolicyChange = await getPortfolioStatus(1);
  const planner = preparePlanner(zone, {
    getPortfolioPlanner: () => portfolio.planner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  })();
  const plan: MovementDesc[] = [];

  t.notThrows(() =>
    planner.resolvePlan(
      1,
      flowId,
      plan,
      afterPolicyChange.policyVersion,
      afterPolicyChange.rebalanceCount,
    ),
  );
  t.deepEqual(await vt.when(stepsP as any), plan);
  t.is(
    (await getPortfolioStatus(1)).rebalanceCount,
    afterPolicyChange.rebalanceCount + 1,
  );
});

test('planner allows cosmos-based portfolio to withdraw to <Cash> via @chain account', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    ...({} as any),
  });
  // cosmos-based portfolio: no sourceAccountId
  const aPortfolio = makePortfolio({ portfolioId: 1 });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  });

  const planner = makePlanner();

  // target allocation no longer includes USDN; the plan fully exits it
  aPortfolio.manager.setTargetAllocation({ Aave_Arbitrum: 100n });

  const portfolioId = 0;
  const amount = { brand: USDC, value: 10_000_000n };
  const withdrawPlan: MovementDesc[] = [
    { src: 'USDN', dest: '@noble', amount },
    { src: '@noble', dest: '<Cash>', amount },
  ];

  const { stepsP, flowId } = aPortfolio.manager.startFlow({
    type: 'withdraw',
    amount,
  });

  t.notThrows(
    () => planner.resolvePlan(portfolioId, flowId, withdrawPlan, 1, 0),
    'withdrawing via @noble to <Cash> is not a new position, even though USDN is absent from target allocation',
  );
  t.deepEqual(await vt.when(stepsP), withdrawPlan);
});

test('planner starts delegated rebalance and resolves its plan', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  let startedFlow: { stepsP: unknown; flowId: number } | undefined;
  const mockExecutePlan = (_seat, _offerArgs, _kit, _flowDetail, flow) => {
    startedFlow = flow;
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      grantee,
      permissions,
    ) {
      t.is(grantee, PortfolioPlannerAgent);
      t.like(permissions, { rebalance: true });
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ USDN: 100n });
  await aPortfolio.manager.setAutoFeatures({
    rebalance: true,
  });

  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: 'USDN', amount },
  ];

  const rebalanceParams = {
    syncState: {
      // setAutoFeatures granted the planner delegation, bumping policyVersion
      // past the setTargetAllocation call above.
      policyVersion: 2,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  const flowKey = planner.rebalance(1, rebalanceParams, plan);

  t.is(flowKey, 'flow1');
  t.truthy(startedFlow);
  t.deepEqual(await vt.when(startedFlow!.stepsP as any), plan);

  const portfolioStatus = await getPortfolioStatus(1);
  t.like(portfolioStatus, {
    policyVersion: 2,
    rebalanceCount: 1,
    flowsRunning: {
      flow1: { type: 'rebalance', agent: 'agent1', agentMemo: '12345' },
    },
  });
});

test('planner cannot start delegated rebalance with new positions', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  const mockExecutePlan = () => {
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      _grantee,
      _permissions,
    ) {
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ USDN: 100n });
  await aPortfolio.manager.setAutoFeatures({
    rebalance: true,
  });

  const amount = { brand: USDC, value: 100n };
  const newPositionPlan: MovementDesc[] = [
    { src: '@noble', dest: 'Aave_Arbitrum', amount },
  ];

  const rebalanceParams = {
    syncState: {
      // setAutoFeatures granted the planner delegation, bumping policyVersion
      // past the setTargetAllocation call above.
      policyVersion: 2,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  t.throws(() => planner.rebalance(1, rebalanceParams, newPositionPlan), {
    message: /planner cannot add positions/i,
  });
});

test('planner starts delegated claimRewards and resolves its plan', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  let startedFlow: { stepsP: unknown; flowId: number } | undefined;
  const mockExecutePlan = (_seat, _offerArgs, _kit, _flowDetail, flow) => {
    startedFlow = flow;
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      grantee,
      permissions,
    ) {
      t.is(grantee, PortfolioPlannerAgent);
      t.like(permissions, { claimRewards: true });
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ Aave_Arbitrum: 100n });
  await aPortfolio.manager.setAutoFeatures({
    claimRewards: true,
  });

  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    {
      src: 'Aave_Arbitrum',
      dest: '@Arbitrum',
      amount,
      claimRewards: { tokens: [], minAmounts: [] },
    },
  ];

  const claimRewardsParams = {
    syncState: {
      // setAutoFeatures granted the planner delegation, bumping policyVersion
      // past the setTargetAllocation call above.
      policyVersion: 2,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  const flowKey = planner.claimRewards(1, claimRewardsParams, plan);

  t.is(flowKey, 'flow1');
  t.truthy(startedFlow);
  t.deepEqual(await vt.when(startedFlow!.stepsP as any), plan);

  const portfolioStatus = await getPortfolioStatus(1);
  t.like(portfolioStatus, {
    policyVersion: 2,
    rebalanceCount: 1,
    flowsRunning: {
      flow1: { type: 'claimRewards', agent: 'agent1', agentMemo: '12345' },
    },
  });
});

test('planner cannot start delegated claimRewards with new positions', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  const mockExecutePlan = () => {
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      _grantee,
      _permissions,
    ) {
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ Aave_Arbitrum: 100n });
  await aPortfolio.manager.setAutoFeatures({
    claimRewards: true,
  });

  const amount = { brand: USDC, value: 100n };
  const newPositionPlan: MovementDesc[] = [
    { src: 'Aave_Arbitrum', dest: 'Compound_Arbitrum', amount },
  ];

  const claimRewardsParams = {
    syncState: {
      // setAutoFeatures granted the planner delegation, bumping policyVersion
      // past the setTargetAllocation call above.
      policyVersion: 2,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  t.throws(() => planner.claimRewards(1, claimRewardsParams, newPositionPlan), {
    message: /planner cannot add positions/i,
  });
});

test('planner cannot start claimRewards without features enabled', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  const mockExecutePlan = () => {
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      grantee,
      permissions,
    ) {
      t.is(grantee, PortfolioPlannerAgent);
      t.like(permissions, { claimRewards: true });
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ Aave_Arbitrum: 100n });

  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    {
      src: 'Aave_Arbitrum',
      dest: '@Arbitrum',
      amount,
      claimRewards: { tokens: [], minAmounts: [] },
    },
  ];

  const claimRewardsParams = {
    syncState: {
      policyVersion: 1,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  t.throws(() => planner.claimRewards(1, claimRewardsParams, plan), {
    message: /planner delegation must be active/,
  });

  await aPortfolio.manager.setAutoFeatures({
    claimRewards: true,
  });

  await aPortfolio.manager.setAutoFeatures({
    claimRewards: false,
  });

  t.throws(() => planner.claimRewards(1, claimRewardsParams, plan), {
    message: /auto-feature "claimRewards" must be enabled/,
  });
});

test('planner allows EVM-based portfolio to withdraw to -Chain via @chain account', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    ...({} as any),
  });
  // EVM-based portfolio: sourceAccountId is set
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  // target allocation no longer includes Aave_Arbitrum; the plan fully exits it
  aPortfolio.manager.setTargetAllocation({ USDN: 100n });

  const portfolioId = 0;
  const amount = { brand: USDC, value: 10_000_000n };
  const withdrawPlan: MovementDesc[] = [
    { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount },
    { src: '@Arbitrum', dest: '-Arbitrum', amount },
  ];

  const { stepsP, flowId } = aPortfolio.manager.startFlow({
    type: 'withdraw',
    amount,
  });

  t.notThrows(
    () => planner.resolvePlan(portfolioId, flowId, withdrawPlan, 1, 0),
    'withdrawing via @Arbitrum to -Arbitrum is not a new position, even though Aave_Arbitrum is absent from target allocation',
  );
  t.deepEqual(await vt.when(stepsP), withdrawPlan);
});

test('planner cannot start rebalance without features enabled', async t => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);

  const mockExecutePlan = () => {
    return vt.asVow(() => undefined);
  };
  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const plannerDelegations = new Map<
    PortfolioKit['planner'],
    PortfolioDelegationClient
  >();
  const makePortfolioKit = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    executePlan: mockExecutePlan as any,
    zcf: mockZcf,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    deliverDelegation(
      client: PortfolioDelegationClient,
      _portfolioId,
      _agentId,
      grantee,
      permissions,
    ) {
      t.is(grantee, PortfolioPlannerAgent);
      t.like(permissions, { rebalance: true });
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
  });
  const planner = makePlanner();

  aPortfolio.manager.setTargetAllocation({ USDN: 100n });

  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: 'USDN', amount },
  ];

  const rebalanceParams = {
    syncState: {
      policyVersion: 1,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  t.throws(() => planner.rebalance(1, rebalanceParams, plan), {
    message: /planner delegation must be active/,
  });

  await aPortfolio.manager.setAutoFeatures({
    rebalance: true,
  });

  await aPortfolio.manager.setAutoFeatures({
    rebalance: false,
  });

  t.throws(() => planner.rebalance(1, rebalanceParams, plan), {
    message: /auto-feature "rebalance" must be enabled/,
  });
});

test('planner can reject a plan due to insufficient funds', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);
  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode: storage.rootNode
      .makeChildNode('ymax0')
      .makeChildNode('portfolios'),
    vowTools: vt,
    ...({} as any),
  });
  const aPortfolio = makePortfolio({ portfolioId: 1 });
  const mockGetPortfolioPlanner = _id => aPortfolio.planner;

  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    getPortfolioPlanner: mockGetPortfolioPlanner,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  });

  const planner = makePlanner();

  // Set up portfolio state
  aPortfolio.manager.setTargetAllocation({ USDN: 100n });

  const portfolioId = 0;
  const amount = { brand: USDC, value: 100n };

  // Start a flow that will be waiting for a plan and simulate proper cleanup
  const { stepsP, flowId } = aPortfolio.manager.startFlow({
    type: 'withdraw',
    amount,
  });

  {
    const {
      policyVersion,
      rebalanceCount,
      flowsRunning = {},
    } = await getPortfolioStatus(1);
    t.log('before reject:', { policyVersion, rebalanceCount, flowsRunning });
    t.is(Object.keys(flowsRunning).length, 1, 'should have one running flow');
    t.is(rebalanceCount, 0, 'rebalanceCount should start at 0');
  }

  // Planner rejects the plan due to insufficient funds
  planner.rejectPlan(portfolioId, 1, 'insufficient funds', 1, 0);

  // Verify the flow's promise gets rejected with the expected error
  await t.throwsAsync(vt.when(stepsP), { message: 'insufficient funds' });

  // Simulate proper cleanup that would happen in production flows
  aPortfolio.reporter.finishFlow(flowId);

  {
    const {
      policyVersion,
      rebalanceCount,
      flowsRunning = {},
    } = await getPortfolioStatus(1);
    t.log('after reject and cleanup:', {
      policyVersion,
      rebalanceCount,
      flowsRunning,
    });
    t.is(
      Object.keys(flowsRunning).length,
      0,
      'flow should be cleaned up after finishFlow',
    );
    t.is(rebalanceCount, 1, 'rebalanceCount increments as usual');
  }
});
