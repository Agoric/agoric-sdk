/**
 * @file Delegation tests through the product surface.
 *
 * These tests exercise the real path:
 * EVM-signed Grant -> per-wallet authorization lookup ->
 * portfolio evmHandler.grant -> postal-service delivery ->
 * grantee redeems invitation -> delegation wallet-store entry -> invocation.
 *
 * This covers the POLA boundary as well as the delegated wrapper policy.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  defaultSerializer,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { Bech32Address } from '@agoric/orchestration';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { NameAdmin } from '@agoric/vats';
import type { Invitation, Proposal, ZoeService } from '@agoric/zoe';
import { E, Far } from '@endo/far';
import type { ExecutionContext } from 'ava';
import {
  checkTurnoverBudget,
  type PortfolioDelegationClient,
} from '../src/delegation.exo.ts';
import { deploy, makeEvmTraderKit } from './contract-setup.ts';
import { evmTrader0PrivateKey } from './mocks.ts';

const PETE_AGENT = 'agoric1petesAgent' as const;
type Deployed = Awaited<ReturnType<typeof deploy>>;
type Receiver<R> = ReturnType<typeof makeDepositFacetSpy<R>>;
type ExpectedDelegationDetails = {
  portfolioId: number;
  agentId: `agent${number}`;
  permissions: {
    allocation?: true | { capBps?: number; maxBpsPerDay?: number };
    rebalance?: true;
  };
};

const emptyProposal = harden({ give: {}, want: {} }) as Proposal;
const delegationDocOpts = {
  pattern: `${ROOT_STORAGE_PATH}.`,
  replacement: 'published.',
  node: 'portfolios.portfolio0',
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

const snapshotVstorage = (
  t: ExecutionContext,
  value: unknown,
  message: string,
) => t.snapshot(value, message);

const readPublishedSubtree = (
  storage: Deployed['common']['bootstrap']['storage'],
  prefix: string,
) => {
  const entries = [...storage.data.keys()]
    .filter(path => path.startsWith(prefix))
    .sort()
    .map(path => [
      path.replace(/^published\./, ''),
      storage.getDeserialized(path).at(-1),
    ]);
  return harden(Object.fromEntries(entries));
};

const makeDepositFacetSpy = <R>() => {
  const deliveries = [] as Invitation<R>[];

  const depositFacet = Far('DepositFacet', {
    async receive(payment: Invitation<R>) {
      deliveries.push(payment);
    },
  });

  return harden({
    depositFacet,
    getDeliveryCount: () => deliveries.length,
    getLatestDelivery: () => deliveries.at(-1),
  });
};

const registerDepositFacet = async (
  namesByAddressAdmin: NameAdmin,
  addr: Bech32Address,
) => {
  const receiver = makeDepositFacetSpy<PortfolioDelegationClient>();
  const { nameAdmin } = await E(namesByAddressAdmin).provideChild(addr, [
    'depositFacet',
  ]);
  await E(nameAdmin).default('depositFacet', receiver.depositFacet);
  return receiver;
};

const openPetePortfolio = async (
  deployed: Deployed,
  delegateAddress = PETE_AGENT,
  allocations = [
    { instrument: 'Aave_Arbitrum', portion: 60n },
    { instrument: 'Compound_Arbitrum', portion: 40n },
  ] as { instrument: string; portion: bigint }[],
  depositAmount = 10_000_000n,
) => {
  const receiver = await registerDepositFacet(
    deployed.common.bootstrap.namesByAddressAdmin,
    delegateAddress,
  );
  const peteKit = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader0PrivateKey,
  });
  const peteArbitrum = peteKit.evmTrader.forChain('Arbitrum');
  await peteArbitrum.openPortfolio([...allocations], depositAmount);
  const portfolioId = peteKit.evmTrader.getPortfolioId();
  return { receiver, peteKit, peteArbitrum, portfolioId };
};

test('turnover budget cost = half-sum(abs(delta)); cash and zeroed positions count', t => {
  for (const {
    name,
    args,
    consumedBps,
    availableBpsBeforeSpend,
    remainingBps,
    allowed,
    refilledBps,
  } of [
    {
      name: 'unchanged target',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        nextAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        maxBpsPerDay: 2400,
        remainingBps: 2400,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 0,
      availableBpsBeforeSpend: 2400,
      remainingBps: 2400,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: '10 points moved between two positions',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        nextAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        maxBpsPerDay: 2400,
        remainingBps: 2400,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 1000,
      availableBpsBeforeSpend: 2400,
      remainingBps: 1400,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: 'arbitrary ratio units should price by normalized weights, not raw point moves',
      args: {
        currentAllocation: { Aave_Arbitrum: 3n, Compound_Arbitrum: 4n },
        nextAllocation: { Aave_Arbitrum: 2n, Compound_Arbitrum: 3n },
        maxBpsPerDay: 2400,
        remainingBps: 2400,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 286,
      availableBpsBeforeSpend: 2400,
      remainingBps: 2114,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: 'zeroing a position still counts',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        nextAllocation: { Aave_Arbitrum: 100n, Compound_Arbitrum: 0n },
        maxBpsPerDay: 4800,
        remainingBps: 4800,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 4000,
      availableBpsBeforeSpend: 4800,
      remainingBps: 800,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: 'cash pseudo-position counts toward turnover',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, '@Base': 40n },
        nextAllocation: { Aave_Arbitrum: 30n, '@Base': 70n },
        maxBpsPerDay: 3600,
        remainingBps: 3600,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 3000,
      availableBpsBeforeSpend: 3600,
      remainingBps: 600,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: 'spend fails when remaining budget is too small',
      args: {
        currentAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        nextAllocation: { Aave_Arbitrum: 35n, Compound_Arbitrum: 65n },
        maxBpsPerDay: 2400,
        remainingBps: 1000,
        secondsElapsedSinceLastUpdate: 0,
      },
      consumedBps: 1500,
      availableBpsBeforeSpend: 1000,
      remainingBps: 1000,
      allowed: false,
      refilledBps: 0,
    },
    {
      name: 'without prior state, first use starts with a full 24-hour budget',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        nextAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        maxBpsPerDay: 2400,
      },
      consumedBps: 1000,
      availableBpsBeforeSpend: 2400,
      remainingBps: 1400,
      allowed: true,
      refilledBps: 0,
    },
    {
      name: 'with prior state, elapsed time refills budget up to the 24-hour cap',
      args: {
        currentAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
        nextAllocation: { Aave_Arbitrum: 35n, Compound_Arbitrum: 65n },
        maxBpsPerDay: 2400,
        currentTimeAbsValue: 9_200n,
        priorTurnoverBudgetState: {
          lastUpdatedAt: 2_000n,
          remainingBpSeconds: 1800n * 24n * 3600n,
        },
      },
      consumedBps: 1500,
      availableBpsBeforeSpend: 2000,
      remainingBps: 500,
      allowed: true,
      refilledBps: 200,
    },
    {
      name: 'refill caps at a full 24-hour budget',
      args: {
        currentAllocation: { Aave_Arbitrum: 60n, Compound_Arbitrum: 40n },
        nextAllocation: { Aave_Arbitrum: 59n, Compound_Arbitrum: 41n },
        maxBpsPerDay: 2400,
        currentTimeAbsValue: 38_000n,
        priorTurnoverBudgetState: {
          lastUpdatedAt: 2_000n,
          remainingBpSeconds: 2_350n * 24n * 3600n,
        },
      },
      consumedBps: 100,
      availableBpsBeforeSpend: 2400,
      remainingBps: 2300,
      allowed: true,
      refilledBps: 1000,
    },
  ]) {
    const result = checkTurnoverBudget(args);

    t.is(result.consumedBps, consumedBps, `${name}: consumedBps`);
    t.is(
      result.availableBpsBeforeSpend,
      availableBpsBeforeSpend,
      `${name}: availableBpsBeforeSpend`,
    );
    t.is(result.refilledBps, refilledBps, `${name}: refilledBps`);
    t.is(result.remainingBps, remainingBps, `${name}: remainingBps`);
    t.is(result.allowed, allowed, `${name}: allowed`);
  }
});

test('turnover budget refills continuously over time', t => {
  for (const {
    secondsElapsedSinceLastUpdate,
    availableBpsBeforeSpend,
    allowed,
    name,
  } of [
    {
      secondsElapsedSinceLastUpdate: 1800,
      availableBpsBeforeSpend: 50,
      allowed: false,
      name: '1800s',
    },
    {
      secondsElapsedSinceLastUpdate: 3600,
      availableBpsBeforeSpend: 100,
      allowed: true,
      name: '3600s',
    },
  ]) {
    const result = checkTurnoverBudget({
      currentAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
      nextAllocation: { Aave_Arbitrum: 49n, Compound_Arbitrum: 51n },
      maxBpsPerDay: 2400,
      remainingBps: 0,
      secondsElapsedSinceLastUpdate,
    });

    t.is(result.consumedBps, 100, `${name}: consumedBps`);
    t.is(
      result.availableBpsBeforeSpend,
      availableBpsBeforeSpend,
      `${name}: availableBpsBeforeSpend`,
    );
    t.is(result.allowed, allowed, `${name}: allowed`);
  }
});

test('turnover budget preserves fractional refill across successful actions', t => {
  let priorTurnoverBudgetState = harden({
    lastUpdatedAt: 0n,
    remainingBpSeconds: 0n,
  });

  for (const hour of [1, 2, 3, 4, 5]) {
    const result = checkTurnoverBudget({
      currentAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
      nextAllocation: { Aave_Arbitrum: 49n, Compound_Arbitrum: 51n },
      maxBpsPerDay: 2500,
      currentTimeAbsValue: BigInt(hour * 3600),
      priorTurnoverBudgetState,
    });

    t.true(result.allowed, `hour ${hour}: allowed`);
    priorTurnoverBudgetState = result.nextTurnoverBudgetState!;
  }

  const sixthHour = checkTurnoverBudget({
    currentAllocation: { Aave_Arbitrum: 50n, Compound_Arbitrum: 50n },
    nextAllocation: { Aave_Arbitrum: 49n, Compound_Arbitrum: 51n },
    maxBpsPerDay: 2500,
    currentTimeAbsValue: 21_600n,
    priorTurnoverBudgetState,
  });

  t.is(
    sixthHour.availableBpsBeforeSpend,
    125,
    'sixth hourly move keeps prior fractional refill instead of dropping it',
  );
  t.is(sixthHour.remainingBps, 25, 'sixth hourly move leaves 25 bps');
});

const redeemAndCheckDelegation = async ({
  t,
  zoe,
  grantStatus,
  receiver,
  expectedDetails,
}: {
  t: ExecutionContext;
  zoe: ZoeService;
  grantStatus: { status: string; error?: string };
  receiver: Receiver<PortfolioDelegationClient>;
  expectedDetails: ExpectedDelegationDetails;
}) => {
  t.is(grantStatus.status, 'ok');
  t.is(receiver.getDeliveryCount(), 1);

  const invitation = receiver.getLatestDelivery();
  t.truthy(invitation);
  if (!invitation) {
    t.fail('expected delegated invitation delivery');
    throw new Error('expected delegated invitation delivery');
  }
  const invitationDetails = await E(zoe).getInvitationDetails(invitation);
  t.is(invitationDetails.description, 'portfolioMandate');
  t.deepEqual(invitationDetails.customDetails, expectedDetails);

  const delegationSeat = await E(zoe).offer(invitation, emptyProposal);
  const delegationClient = await E(delegationSeat).getOfferResult();
  return { invitation, invitationDetails, delegationClient };
};

test('Pete may grant his own portfolio and grantee may rebalance through the redeemed delegation facet', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum, portfolioId } =
    await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId,
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    { policyVersion, rebalanceCount },
  );
  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const portfolioPath = peteKit.evmTrader
    .getPortfolioPath()
    .replace(/^[^.]+\./, '');
  const flowAgent = await peteKit.readPublished(
    `${portfolioPath}.flows.${rebalanceFlowId}.agent`,
  );
  t.deepEqual(flowAgent, { id: 'agent1' });
  const agents = await peteKit.readPublished(`${portfolioPath}.agents`);
  t.deepEqual(agents, {
    agent1: {
      grantee: PETE_AGENT,
      permissions: { allocation: true },
      state: 'active',
    },
  });
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 50n,
    Compound_Arbitrum: 50n,
  });
  await documentStorageSchema(
    t,
    deployed.common.bootstrap.storage,
    delegationDocOpts,
  );
});

test('Granted rebalance cannot introduce a new instrument', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceP = E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 60n,
      Aave_Base: 40n,
    },
    { policyVersion, rebalanceCount },
  );

  await t.throwsAsync(() => rebalanceP, {
    message: /unauthorized allocations for/,
  });

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
  });
});

test('Granted rebalance may retain an instrument key with zero portion', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
    },
    { policyVersion, rebalanceCount },
  );

  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 100n,
    Compound_Arbitrum: 0n,
  });
});

test('delegated setTargetAllocation rejects a position above allocation cap', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: { capBps: 3000 },
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: { capBps: 3000 } },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceP = E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 31n,
      Compound_Arbitrum: 69n,
    },
    { policyVersion, rebalanceCount },
  );

  await t.throwsAsync(() => rebalanceP, {
    message: /target allocation exceeds allocation cap/,
  });
});

test('delegated setTargetAllocation ignores allocation cap for cash pseudo positions', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(
    deployed,
    PETE_AGENT,
    [
      { instrument: 'Aave_Arbitrum', portion: 60n },
      { instrument: '@Base', portion: 40n },
    ],
  );
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: { capBps: 3000 },
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: { capBps: 3000 } },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 30n,
      '@Base': 70n,
    },
    { policyVersion, rebalanceCount },
  );

  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 30n,
    '@Base': 70n,
  });
});

test('delegated setTargetAllocation remains uncapped when allocation cap is absent', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
    },
    { policyVersion, rebalanceCount },
  );

  t.regex(String(rebalanceFlowId), /^flow\d+$/);
});

test('delegated setTargetAllocation requires allocation permission', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(PETE_AGENT, harden({}));
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: {},
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const rebalanceP = E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    {
      policyVersion: before.policyVersion,
      rebalanceCount: before.rebalanceCount,
    },
  );

  await t.throwsAsync(() => rebalanceP, {
    message: /delegated action requires allocation permission/,
  });
});

test('delegated setTargetAllocation starts with a full 24-hour budget and refills over time', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);

  // The protocol/API takes `maxBpsPerDay`; the human-facing percent/day
  // phrasing here is just the agent-side translation step.
  const peteSays = harden({ percentPerDay: 25 });
  const maxBpsPerDay = peteSays.percentPerDay * 100;

  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({ allocation: { maxBpsPerDay } }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: { maxBpsPerDay } },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const firstFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 36n,
      Compound_Arbitrum: 64n,
    },
    {
      policyVersion: before.policyVersion,
      rebalanceCount: before.rebalanceCount,
    },
  );
  t.regex(String(firstFlowId), /^flow\d+$/);

  const afterFirst = await peteKit.evmTrader.getPortfolioStatus();
  const rebalanceP = E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 34n,
      Compound_Arbitrum: 66n,
    },
    {
      policyVersion: afterFirst.policyVersion,
      rebalanceCount: afterFirst.rebalanceCount,
    },
  );

  await t.throwsAsync(() => rebalanceP, {
    message: /delegated move exceeds delegated turnover budget/,
  });

  await deployed.timerService.tickN(3600, 'advance one hour for delegation');

  const afterFailedSecond = await peteKit.evmTrader.getPortfolioStatus();
  const thirdFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 34n,
      Compound_Arbitrum: 66n,
    },
    {
      policyVersion: afterFailedSecond.policyVersion,
      rebalanceCount: afterFailedSecond.rebalanceCount,
    },
  );

  t.regex(String(thirdFlowId), /^flow\d+$/);
});

test('stale delegated setTargetAllocation must not consume turnover budget before version checks', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);

  const maxBpsPerDay = 2500;
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({ allocation: { maxBpsPerDay } }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: { maxBpsPerDay } },
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const firstFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 37n,
      Compound_Arbitrum: 63n,
    },
    {
      policyVersion: before.policyVersion,
      rebalanceCount: before.rebalanceCount,
    },
  );
  t.regex(String(firstFlowId), /^flow\d+$/);

  const afterFirst = await peteKit.evmTrader.getPortfolioStatus();
  const ownerFlowId = await peteArbitrum.setTargetAllocation([
    { instrument: 'Aave_Arbitrum', portion: 37n },
    { instrument: 'Compound_Arbitrum', portion: 63n },
  ]);
  t.regex(String(ownerFlowId), /^flow\d+$/);

  const staleSync = {
    policyVersion: afterFirst.policyVersion,
    rebalanceCount: afterFirst.rebalanceCount,
  };
  const staleMoveP = E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 35n,
      Compound_Arbitrum: 65n,
    },
    staleSync,
  );
  await t.throwsAsync(() => staleMoveP, {
    message: /expected policyVersion/,
  });

  await deployed.timerService.tickN(3600, 'advance one hour after stale sync');

  const fresh = await peteKit.evmTrader.getPortfolioStatus();
  const retryFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 35n,
      Compound_Arbitrum: 65n,
    },
    {
      policyVersion: fresh.policyVersion,
      rebalanceCount: fresh.rebalanceCount,
    },
  );
  t.regex(String(retryFlowId), /^flow\d+$/);
});

test.todo(
  'portfolio-wide turnover budgets: two delegates on one portfolio can each stay within their own budget while exceeding a shared per-portfolio budget',
);

test('Delegation is active only while registered on the portfolio', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);
  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  const portfolioPath = peteKit.evmTrader
    .getPortfolioPath()
    .replace(/^[^.]+\./, '');
  const agents = await peteKit.readPublished(`${portfolioPath}.agents`);
  t.deepEqual(agents, {
    agent1: {
      grantee: PETE_AGENT,
      permissions: { allocation: true },
      state: 'active',
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const { policyVersion, rebalanceCount } = before;
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation(
    {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    { policyVersion, rebalanceCount },
  );
  t.regex(String(rebalanceFlowId), /^flow\d+$/);
});

test('Grant allows empty permissions', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;
  const { receiver, peteKit, peteArbitrum } = await openPetePortfolio(deployed);

  const grantStatus = await peteArbitrum.grant(PETE_AGENT, harden({}));

  await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus,
    receiver,
    expectedDetails: {
      portfolioId: peteKit.evmTrader.getPortfolioId(),
      agentId: 'agent1',
      permissions: {},
    },
  });
});

test('Grant delivery failure is surfaced in wallet vstorage without publishing an unusable agent', async t => {
  const deployed = await deploy(t);
  const peteKit = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader0PrivateKey,
  });
  const peteArbitrum = peteKit.evmTrader.forChain('Arbitrum');
  await peteArbitrum.openPortfolio(
    [
      { instrument: 'Aave_Arbitrum', portion: 60n },
      { instrument: 'Compound_Arbitrum', portion: 40n },
    ],
    10_000_000n,
  );

  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({
      allocation: true,
    }),
  );

  t.is(grantStatus.status, 'error');
  if (!('error' in grantStatus)) {
    t.fail('expected delivery failure to be published in wallet status');
    return;
  }
  t.regex(grantStatus.error || '', /"nameKey" not found: "agoric1petesAgent"/);

  const walletStatusPath = `ymax0.evmWallets.${peteKit.evmAccount.address}`;
  const walletStatus = await peteKit.readPublished(
    walletStatusPath.replace(/^ymax0\./, ''),
  );
  const portfolioPath = peteKit.evmTrader.getPortfolioPath();
  const portfolioSubtree = readPublishedSubtree(
    deployed.common.bootstrap.storage,
    portfolioPath,
  );

  snapshotVstorage(
    t,
    harden({
      [walletStatusPath]: walletStatus,
      ...portfolioSubtree,
    }),
    'grant delivery failure vstorage',
  );
});
