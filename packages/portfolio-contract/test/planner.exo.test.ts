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

test('planner exo submit method', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);
  // Mock dependencies with minimal implementation
  const mockRebalance = (_seat, offerArgs, _kit) => {
    t.log('rebalance called with', offerArgs);
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
  const mockGetPortfolio = _id => aPortfolio;

  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    rebalance: mockRebalance,
    zcf: mockZcf,
    getPortfolio: mockGetPortfolio,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
    vowTools: vt,
  });

  const planner = makePlanner();

  // Test submit method
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
  const plan: MovementDesc[] = [
    { src: '+agoric', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: 'USDN', amount },
  ];

  await t.throwsAsync(vt.when(planner.submit(portfolioId, plan, 0, 0)), {
    message: /expected policyVersion 1; got 0/,
  });

  await vt.when(planner.submit(portfolioId, plan, 1, 0));

  {
    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 1 },
      'rebalanceCount 1 after .submit(plan, ...)',
    );
  }

  const mockRebalancePlan = [];
  await t.notThrowsAsync(
    vt.when(planner.submit(portfolioId, mockRebalancePlan, 1, 1)),
    'planner may rebalance >1 times at same policyVersion',
  );

  aPortfolio.manager.startFlow({ type: 'withdraw', amount });
  await t.notThrowsAsync(
    vt.when(planner.resolvePlan(portfolioId, 1, plan, 1, 2)),
  );
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
      t.deepEqual(permissions, { rebalance: true });
      plannerDelegations.set(aPortfolio.planner, client);
    },
    ...({} as any),
  });
  const aPortfolio = makePortfolioKit({
    portfolioId: 1,
    sourceAccountId: 'eip155:42161:0x7878787878787878787878787878787878787878',
  });
  const mockGetPortfolio = _id => aPortfolio;

  const makePlanner = preparePlanner(zone, {
    zcf: mockZcf,
    getPortfolio: mockGetPortfolio,
    getPlannerDelegation: portfolioPlanner =>
      plannerDelegations.get(portfolioPlanner),
    shapes: makeOfferArgsShapes(USDC),
    vowTools: vt,
    ...({} as any),
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
  const flowKey = planner.rebalance(0, plan, 1, 0);

  t.is(flowKey, 'flow1');
  t.truthy(startedFlow);
  t.deepEqual(await vt.when(startedFlow!.stepsP as any), plan);

  const portfolioStatus = await getPortfolioStatus(1);
  t.like(portfolioStatus, { policyVersion: 1, rebalanceCount: 1 });
});

test('planner can reject a plan due to insufficient funds', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);
  // Mock dependencies with minimal implementation
  const mockRebalance = (_seat, offerArgs, _kit) => {
    t.log('rebalance called with', offerArgs);
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
  const mockGetPortfolio = _id => aPortfolio;

  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    rebalance: mockRebalance,
    zcf: mockZcf,
    getPortfolio: mockGetPortfolio,
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
    vowTools: vt,
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
