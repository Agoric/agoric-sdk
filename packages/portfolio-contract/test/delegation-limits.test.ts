/** @file Tests for delegated portfolio mandates and plan evidence. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import type {
  FundsFlowPlan,
  PlanObservations,
  TargetAllocation,
} from '@agoric/portfolio-api';
import {
  assertMandateForAllocation,
  assertMandateForPlanObservations,
  vetAllocationPlan,
  vetObservationPlaces,
  vetPlanAllocation,
} from '../src/delegation-limits.ts';

const { brand: USDC } = makeIssuerKit('USDC');

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
        harden(observations),
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
        { balances: { '@Base': 100n }, instrumentTvls: {} },
      ),
    { message: /missing balance observation.*Aave_Base.*Compound_Base/ },
  );
});

test('balance observations report all extra places together', t => {
  t.throws(
    () =>
      vetObservationPlaces(
        ['@Base'],
        { flow: [] },
        {
          balances: { '@Base': 100n, Aave_Base: 0n, Compound_Base: 0n },
          instrumentTvls: {},
        },
      ),
    { message: /unexpected balance observation.*Aave_Base.*Compound_Base/ },
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
