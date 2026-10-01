import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import { PortfolioPlannerAgent } from '@agoric/portfolio-api';
import type {
  FundsFlowPlan,
  PlanObservations,
  TargetAllocation,
} from '@agoric/portfolio-api';
import type { PortfolioDelegationClient } from '../src/delegation.exo.ts';
import { preparePlanner, vetPlanAllocation } from '../src/planner.exo.ts';
import {
  type PortfolioKit,
  preparePortfolioKit,
  vetAllocationPlan,
} from '../src/portfolio.exo.ts';
import {
  makeOfferArgsShapes,
  type MovementDesc,
} from '../src/type-guards-steps.ts';
import { makeStorageTools } from './supports.ts';

const { brand: USDC } = makeIssuerKit('USDC');

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
