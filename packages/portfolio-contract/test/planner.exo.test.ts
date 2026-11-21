/** @file Tests for the planner exo. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import {
  PortfolioPlannerAgent,
  type PlanObservations,
  type PortfolioDelegatedClaimRewardsParams,
  type PortfolioSyncState,
} from '@agoric/portfolio-api';
import type {
  PortfolioObservationsContent,
  SignedPortfolioObservations,
} from '@agoric/portfolio-api/src/observation-messages.js';
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
import { contractsMock } from './mocks.ts';
import { makeStorageTools } from './supports.ts';

const { brand: USDC } = makeIssuerKit('USDC');

/** Accept fakeSignedObservations without checking any signature. */
const fakeVerifyObservations = async (signed: SignedPortfolioObservations) =>
  harden({
    ...(signed.message as unknown as PortfolioObservationsContent),
    issuedAt: 0n,
    deadline: 300n,
    verifiedAt: 0n,
  });

/** A delegated request claiming Merkl rewards at the Ethereum account. */
const makeMerklClaimParams = (
  syncState: PortfolioSyncState,
  flow: MovementDesc[] = [],
): PortfolioDelegatedClaimRewardsParams =>
  harden({
    syncState,
    agentMemo: '12345',
    plan: {
      flow: [
        {
          src: '@Ethereum',
          dest: '@Ethereum',
          amount: { brand: USDC, value: 0n },
          claimRewards: { protocol: 'merkl', index: 0 },
        },
        ...flow,
      ],
    },
    signedObservations: harden({
      domain: {},
      types: {},
      primaryType: 'PortfolioObservations',
      signature: '0x',
      message: {
        portfolioId: 1,
        syncState,
        observations: {
          balances: { '@Ethereum': 0n },
          instrumentTvls: {},
          merklClaims: [
            {
              accountPlace: '@Ethereum',
              distributor: contractsMock.Ethereum.merkleDistributor!,
              tokenId: '0x00000000000000000000000000000000000000aa',
              cumulativeAmount: 2n,
              claimedAmount: 1n,
              proofs: [],
            },
          ],
        },
      },
    }) as unknown as SignedPortfolioObservations,
  });

/** Give a portfolio the Ethereum account where it claims Merkl rewards. */
const provideEthereumAccount = (
  { manager }: Pick<PortfolioKit, 'manager'>,
  vt: ReturnType<typeof prepareVowTools>,
) => {
  const { ready } = manager.reserveAccountState('Ethereum');
  void vt.when(ready).catch(() => {});
  manager.initAccountInfo({
    chainName: 'Ethereum',
    chainId: 'eip155:1',
    namespace: 'eip155',
    remoteAddress: '0x9999999999999999999999999999999999999999',
  });
};

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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  // Until the signed-observation planner design is introduced as a whole,
  // expose only the established plan-resolution path on both planner facets.
  t.false('resolveObservedPlan' in planner);
  t.false('resolveObservedFlowPlan' in aPortfolio.planner);

  const oversizedSteps = harden(
    Array(31).fill({
      src: '@noble',
      dest: 'USDN',
      amount: { brand: USDC, value: 1n },
    }),
  );
  t.throws(() => planner.resolvePlan(1, 0, oversizedSteps, 0, 0), {
    message: /In "resolvePlan" method.*arg 2:.*Must match one of/s,
  });

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
    t.deepEqual(await vt.when(stepsP), { plan });

    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 1 },
      'rebalanceCount 1 after .resolvePlan(plan, ...)',
    );

    // This unit test has no executor, so manually finish the resolved flow.
    aPortfolio.reporter.finishFlow(flowId);
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

    t.deepEqual(await vt.when(stepsP), { plan: mockRebalancePlan });

    const { policyVersion, rebalanceCount } = await getPortfolioStatus(1);
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 2 },
      'rebalanceCount 2 after second resolvePlan',
    );

    aPortfolio.reporter.finishFlow(flowId);
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
      { message: /plan cannot add positions/i },
    );

    aPortfolio.reporter.finishFlow(flowId);
  }
});

test('planner resolvePlan validates and forwards typed holdings', t => {
  const zone = makeHeapZone();
  const observations = harden({
    balances: { Aave_Base: 100n },
    holdings: [
      {
        place: 'Aave_Base',
        kind: 'principal',
        tokenId: `0x${'1'.repeat(40)}`,
        amount: 100n,
        balanceUsdc: 100n,
      },
    ],
    instrumentTvls: {},
  } satisfies PlanObservations);
  const received: unknown[] = [];
  const planner = preparePlanner(zone, {
    getPortfolioPlanner: () =>
      ({
        getTargetAllocation: () => ({ Aave_Base: 100n }),
        validateAndCommitPlanPolicy: (_flowId, obs) => {
          received.push(obs);
          return { policyVersion: 1, rebalanceCount: 1 };
        },
        submitVersion: () => {},
        resolveFlowPlan: () => {},
      }) as unknown as PortfolioKit['planner'],
    getPlannerDelegation: () => undefined,
    shapes: makeOfferArgsShapes(USDC),
  })();
  t.notThrows(() => planner.resolvePlan(1, 1, [], 1, 0, observations));
  t.deepEqual(received, [observations]);
  for (const fields of [
    { amount: -1n },
    { kind: 'unknown' },
    { tokenId: 1n },
  ]) {
    t.throws(() =>
      planner.resolvePlan(
        1,
        2,
        [],
        1,
        1,
        harden({
          ...observations,
          holdings: [{ ...observations.holdings[0], ...fields }],
        }) as any,
      ),
    );
  }
  t.deepEqual(
    received,
    [observations],
    'malformed holdings never reach policy validation',
  );
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
  const flowKey = await delegationClient.setTargetAllocation({
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

  // The executePlan stub only captures stepsP. Simulate the production
  // executor's finally cleanup after observing the rejected plan.
  t.truthy((await getPortfolioStatus(1)).flowsRunning?.[flowKey]);
  portfolio.reporter.finishFlow(flowId);

  const beforeRace = await getPortfolioStatus(1);
  t.deepEqual(beforeRace.flowsRunning, {});
  const racedFlowKey = await delegationClient.setTargetAllocation({
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

  portfolio.reporter.finishFlow(racedFlowId);
  t.deepEqual((await getPortfolioStatus(1)).flowsRunning, {});
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
  const flowKey = await delegationClient.setTargetAllocation({
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
  t.deepEqual(await vt.when(stepsP as any), { plan });
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
  t.deepEqual(await vt.when(stepsP), { plan: withdrawPlan });
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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  const flowKey = await planner.rebalance(1, rebalanceParams, plan);

  t.is(flowKey, 'flow1');
  t.truthy(startedFlow);
  t.deepEqual(await vt.when(startedFlow!.stepsP as any), { plan });

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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  await t.throwsAsync(planner.rebalance(1, rebalanceParams, newPositionPlan), {
    message: /plan cannot add positions/i,
  });

  // The planner supplies its plan separately, not also in the params.
  await t.throwsAsync(
    planner.rebalance(
      1,
      { ...rebalanceParams, plan: { flow: newPositionPlan } },
      newPositionPlan,
    ),
    {
      message:
        'a separate plan excludes a plan or signed observations in the params',
    },
  );
});

test('planner rebalances with a plan selecting signed observations', async t => {
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
      _grantee,
      _permissions,
    ) {
      plannerDelegations.set(aPortfolio.planner, client);
    },
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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
  await aPortfolio.manager.setAutoFeatures({ rebalance: true });
  provideEthereumAccount(aPortfolio, vt);

  // setAutoFeatures granted the planner delegation, bumping policyVersion
  // past the setTargetAllocation call above.
  const signedParams = makeMerklClaimParams({
    policyVersion: 2,
    rebalanceCount: 0,
  });
  const {
    plan: _plan,
    signedObservations: _signed,
    ...bareParams
  } = signedParams;
  const separatePlan: MovementDesc[] = [];

  await t.throwsAsync(planner.rebalance(1, bareParams), {
    message:
      'a plan is required, either with signed observations or separately',
  });
  await t.throwsAsync(planner.rebalance(1, signedParams, separatePlan), {
    message:
      'a separate plan excludes a plan or signed observations in the params',
  });
  await t.throwsAsync(
    planner.rebalance(
      1,
      { ...bareParams, signedObservations: signedParams.signedObservations },
      separatePlan,
    ),
    {
      message:
        'a separate plan excludes a plan or signed observations in the params',
    },
  );
  await t.throwsAsync(planner.rebalance(1, signedParams), {
    message:
      'delegation "agent1" does not have required permission "claimRewards"',
  });
  t.like(
    await getPortfolioStatus(1),
    { flowCount: 0, rebalanceCount: 0 },
    'no flow is left behind',
  );

  await aPortfolio.manager.setAutoFeatures({ claimRewards: true });
  // The regrant bumped policyVersion again.
  const flowKey = await planner.rebalance(
    1,
    makeMerklClaimParams({ policyVersion: 3, rebalanceCount: 0 }),
  );

  t.is(flowKey, 'flow1');
  t.like(await vt.when(startedFlow!.stepsP as any), {
    plan: signedParams.plan,
    boundSteps: { 0: { kind: 'claimRewards', protocol: 'merkl' } },
  });
  t.like(await getPortfolioStatus(1), {
    policyVersion: 3,
    rebalanceCount: 1,
    flowsRunning: {
      flow1: { type: 'rebalance', agent: 'agent1', agentMemo: '12345' },
    },
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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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
  provideEthereumAccount(aPortfolio, vt);

  // setAutoFeatures granted the planner delegation, bumping policyVersion
  // past the setTargetAllocation call above.
  const claimRewardsParams = makeMerklClaimParams({
    policyVersion: 2,
    rebalanceCount: 0,
  });

  const flowKey = await planner.claimRewards(1, claimRewardsParams);

  t.is(flowKey, 'flow1');
  t.truthy(startedFlow);
  t.like(await vt.when(startedFlow!.stepsP as any), {
    plan: claimRewardsParams.plan,
    boundSteps: {
      0: {
        kind: 'claimRewards',
        protocol: 'merkl',
        account: '@Ethereum',
        expectedAmount: 1n,
      },
    },
  });

  const portfolioStatus = await getPortfolioStatus(1);
  t.like(portfolioStatus, {
    policyVersion: 2,
    rebalanceCount: 1,
    flowsRunning: {
      flow1: {
        type: 'claimRewards',
        agent: 'agent1',
        agentMemo: '12345',
        createdAtPolicyVersion: 2,
      },
    },
  });
});

test('planner claim plans may only claim and swap rewards', async t => {
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
      _grantee,
      _permissions,
    ) {
      plannerDelegations.set(aPortfolio.planner, client);
    },
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  provideEthereumAccount(aPortfolio, vt);

  const amount = { brand: USDC, value: 100n };
  const claimRewardsParams = makeMerklClaimParams(
    {
      // setAutoFeatures granted the planner delegation, bumping policyVersion
      // past the setTargetAllocation call above.
      policyVersion: 2,
      rebalanceCount: 0,
    },
    [{ src: '@Ethereum', dest: 'Aave_Ethereum', amount }],
  );

  await t.throwsAsync(planner.claimRewards(1, claimRewardsParams), {
    message: 'a reward plan may only claim and swap rewards, not step 1',
  });
  t.like(
    await getPortfolioStatus(1),
    { flowCount: 0, rebalanceCount: 0 },
    'no flow is left behind',
  );
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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  const claimRewardsParams = makeMerklClaimParams({
    policyVersion: 1,
    rebalanceCount: 0,
  });

  await t.throwsAsync(planner.claimRewards(1, claimRewardsParams), {
    message: /planner delegation must be active/,
  });

  await aPortfolio.manager.setAutoFeatures({
    claimRewards: true,
  });

  await aPortfolio.manager.setAutoFeatures({
    claimRewards: false,
  });

  await t.throwsAsync(planner.claimRewards(1, claimRewardsParams), {
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
    toChain: 'Arbitrum',
  });

  t.notThrows(
    () => planner.resolvePlan(portfolioId, flowId, withdrawPlan, 1, 0),
    'withdrawing via @Arbitrum to -Arbitrum is not a new position, even though Aave_Arbitrum is absent from target allocation',
  );
  t.deepEqual(await vt.when(stepsP), { plan: withdrawPlan });
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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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

  await t.throwsAsync(planner.rebalance(1, rebalanceParams, plan), {
    message: /planner delegation must be active/,
  });

  await aPortfolio.manager.setAutoFeatures({
    rebalance: true,
  });

  await aPortfolio.manager.setAutoFeatures({
    rebalance: false,
  });

  await t.throwsAsync(planner.rebalance(1, rebalanceParams, plan), {
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
    verifyPortfolioObservations: fakeVerifyObservations,
    contracts: contractsMock,
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
