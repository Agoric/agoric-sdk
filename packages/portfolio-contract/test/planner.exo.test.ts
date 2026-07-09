import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import { PortfolioPlannerAgent } from '@agoric/portfolio-api';
import type { PortfolioDelegationClient } from '../src/delegation.exo.ts';
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

test('planner exo resolvePlan method', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const { getPortfolioStatus } = makeStorageTools(storage);
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
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

test('planner allows cosmos-based portfolio to withdraw to <Cash> via @chain account', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
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
      policyVersion: 1,
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
    policyVersion: 1,
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
      policyVersion: 1,
      rebalanceCount: 0,
    },
    agentMemo: '12345',
  };

  t.throws(() => planner.rebalance(1, rebalanceParams, newPositionPlan), {
    message: /planner cannot add positions/i,
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
