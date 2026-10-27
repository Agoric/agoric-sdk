/** @file YMax portfolio contract — customer-agent supplied plans. */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import assert from 'node:assert/strict';

import { eventLoopIteration as pendingVstorageWrites } from '@agoric/internal/src/testing-utils.js';
import type {
  PlanObservations,
  PortfolioDelegatedSetTargetAllocationParams,
} from '@agoric/portfolio-api';
import {
  portfolioObservationsToEIP712,
  ymaxObservationMessageKit,
  type SignedPortfolioObservations,
} from '@agoric/portfolio-api/src/observation-messages.js';
import type { TimerService } from '@agoric/time';
import type { TargetAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { NameAdmin } from '@agoric/vats';
import type { Invitation, Proposal, ZoeService } from '@agoric/zoe';
import { E, Far } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { privateKeyToAccount } from 'viem/accounts';
import type { PortfolioDelegationClient } from '../src/delegation.exo.ts';
import { deploy, makeEvmTraderKit } from './contract-setup.ts';
import { makeDirectPlannerClient } from './contract-test-support.ts';
import {
  contractsMock,
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
} from './mocks.ts';

const AGENT_ADDRESS = 'agoric1andrewAgent' as const;
/** The observation service's EOA, which signs portfolio observations. */
const attestor = privateKeyToAccount(evmTrader1PrivateKey);
const ARBITRUM_CHAIN_ID = 42161n;
/** The lifetime the observation service gives its observations. */
const OBSERVATION_LIFETIME = 5n * 60n;
const emptyProposal = harden({ give: {}, want: {} }) as Proposal;

const makeWalletFactory = (namesByAddressAdmin: NameAdmin, zoe: ZoeService) => {
  const makeSmartWallet = () => {
    let invitationToExecute: Invitation<unknown> | undefined;
    const depositFacet = Far('SmartWallet depositFacet', {
      async receive(invitation: Invitation<unknown>) {
        invitationToExecute = invitation;
      },
    });
    return harden({
      getDepositFacet: () => depositFacet,
      async executeOffer<T>() {
        assert(invitationToExecute, 'invitation not delivered');
        const invitation = invitationToExecute;
        invitationToExecute = undefined;
        const seat = await E(zoe).offer(invitation, emptyProposal);
        return E(seat).getOfferResult() as Promise<T>;
      },
    });
  };

  return harden({
    async provideSmartWallet(address: string) {
      const wallet = makeSmartWallet();
      const { nameAdmin } = await E(namesByAddressAdmin).provideChild(address, [
        'depositFacet',
      ]);
      await E(nameAdmin).default('depositFacet', wallet.getDepositFacet());
      return wallet;
    },
  });
};

type AgentWallet = Awaited<
  ReturnType<ReturnType<typeof makeWalletFactory>['provideSmartWallet']>
>;
type EvmTraderKit = Awaited<ReturnType<typeof makeEvmTraderKit>>;
type PortfolioRead = {
  getPortfolioId: EvmTraderKit['evmTrader']['getPortfolioId'];
  getPortfolioStatus: EvmTraderKit['evmTrader']['getPortfolioStatus'];
  getPortfolioPath: EvmTraderKit['evmTrader']['getPortfolioPath'];
  readPublished: EvmTraderKit['readPublished'];
};

type PortfolioId = ReturnType<PortfolioRead['getPortfolioId']>;
type SyncState = PortfolioDelegatedSetTargetAllocationParams['syncState'];
type Mcp = {
  // AGO-1298: hosted MCP obtains signed observations; the agent only forwards them.
  // The observations are of the portfolio at a given sync state.
  attest: (
    portfolioId: PortfolioId,
    syncState: SyncState,
  ) => Promise<SignedPortfolioObservations>;
};

const makeMcp = (
  {
    getExpectedPortfolioId,
    timerService,
  }: {
    getExpectedPortfolioId: () => PortfolioId;
    timerService: TimerService;
  },
  observations: PlanObservations = harden({
    balances: {
      '@agoric': 0n,
      '@Arbitrum': 0n,
      Aave_Arbitrum: 120_003_400n,
      Compound_Arbitrum: 80_002_300n,
    },
    instrumentTvls: {},
  }),
): Mcp =>
  harden({
    async attest(portfolioId: PortfolioId, syncState: SyncState) {
      assert.equal(portfolioId, getExpectedPortfolioId());
      const { absValue: issuedAt } =
        await E(timerService).getCurrentTimestamp();
      const message = ymaxObservationMessageKit.getStandaloneOperationData(
        {
          ...portfolioObservationsToEIP712({
            portfolioId,
            syncState,
            observations,
          }),
          nonce: issuedAt,
          deadline: issuedAt + OBSERVATION_LIFETIME,
        },
        'PortfolioObservations',
        ARBITRUM_CHAIN_ID,
        contractsMock.Arbitrum.remoteAccountRouter!,
      );
      return harden({
        ...message,
        signature: await attestor.signTypedData(message),
      });
    },
  });

type AgentDecision = Pick<
  PortfolioDelegatedSetTargetAllocationParams,
  'plan' | 'targetAllocation'
>;
type AgentConfig = AgentDecision & {
  initialAllocation: TargetAllocation[];
};

const makeAgent = (
  powers: {
    wallet: AgentWallet;
    portfolioRead: PortfolioRead;
    mcp: Mcp;
  },
  config: AgentConfig,
) => {
  const { wallet, portfolioRead, mcp } = powers;
  const { initialAllocation, plan, targetAllocation } = harden(config);
  let delegationClient: PortfolioDelegationClient | undefined;
  return harden({
    proposeInitialAllocation: () => initialAllocation,
    async redeem() {
      delegationClient = await wallet.executeOffer<PortfolioDelegationClient>();
    },
    async wake() {
      assert(delegationClient, 'delegation not redeemed');
      const before = await portfolioRead.getPortfolioStatus();
      const syncState = harden({
        policyVersion: before.policyVersion,
        rebalanceCount: before.rebalanceCount,
      });
      const signedObservations = await mcp.attest(
        portfolioRead.getPortfolioId(),
        syncState,
      );
      const submitted = harden({
        syncState,
        targetAllocation,
        plan,
        signedObservations,
      }) satisfies PortfolioDelegatedSetTargetAllocationParams;

      return E(delegationClient).setTargetAllocation(submitted);
    },
  });
};

const initialAllocation: TargetAllocation[] = harden([
  { instrument: 'Aave_Arbitrum', portion: 60n },
  { instrument: 'Compound_Arbitrum', portion: 40n },
  { instrument: 'Aave_Avalanche', portion: 0n },
]);

const setupTest = async (t: ExecutionContext) => {
  const deployed = await deploy(t, {
    observationAttestor: attestor.address,
    'features.agenticPlanning': true,
  });
  const { zoe, common, timerService } = deployed;
  const walletFactory = makeWalletFactory(
    common.bootstrap.namesByAddressAdmin,
    zoe,
  );
  const traderKit = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader0PrivateKey,
  });
  const portfolioRead = harden({
    getPortfolioId: () => traderKit.evmTrader.getPortfolioId(),
    getPortfolioStatus: () => traderKit.evmTrader.getPortfolioStatus(),
    getPortfolioPath: () => traderKit.evmTrader.getPortfolioPath(),
    readPublished: traderKit.readPublished,
  });
  const trader = traderKit.evmTrader.forChain('Arbitrum');
  const mcpPowers = harden({
    getExpectedPortfolioId: () => portfolioRead.getPortfolioId(),
    timerService,
  });
  const mcp = makeMcp(mcpPowers);

  return harden({
    walletFactory,
    trader,
    portfolioRead,
    mcp,
    mcpPowers,
    async cancelOpening() {
      const planner = makeDirectPlannerClient(
        zoe,
        deployed.started.creatorFacet,
      );
      await planner.redeem();
      const status = await portfolioRead.getPortfolioStatus();
      // These tests supply synthetic balances in signed observations and test
      // plan admission, not deposit execution. Explicitly cancel the opening
      // deposit so that it no longer occupies the portfolio's flow slot.
      await E(planner.stub).rejectPlan(
        portfolioRead.getPortfolioId(),
        1,
        'opening deposit omitted in plan-admission fixture',
        status.policyVersion,
        status.rebalanceCount,
      );
      await pendingVstorageWrites();
      t.deepEqual((await portfolioRead.getPortfolioStatus()).flowsRunning, {});
    },
    usdc: common.brands.usdc,
    bld: common.brands.bld,
  });
};

type PortfolioPublishedPath = `ymax${'0' | '1'}.portfolios.portfolio${number}`;

const publishedPortfolioPath = (
  portfolioRead: PortfolioRead,
): PortfolioPublishedPath =>
  portfolioRead
    .getPortfolioPath()
    .replace(
      new RegExp(`^${ROOT_STORAGE_PATH}\\.`),
      '',
    ) as PortfolioPublishedPath;

const promptInjectionScenario = async (t: ExecutionContext) => {
  const { walletFactory, trader, portfolioRead, mcpPowers, usdc } =
    await setupTest(t);
  const mcp = makeMcp(
    mcpPowers,
    harden({
      balances: {
        '@agoric': 0n,
        Aave_Arbitrum: 120_003_400n,
        Aave_Avalanche: 0n,
        Compound_Arbitrum: 80_002_300n,
      },
      instrumentTvls: {},
    }),
  );
  const agentWallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const dest = 'Aave_Avalanche';
  const agent = makeAgent(
    { wallet: agentWallet, portfolioRead, mcp },
    {
      initialAllocation,
      plan: {
        flow: [
          { src: 'Aave_Arbitrum', dest, amount: usdc.make(120_003_400n) },
          { src: 'Compound_Arbitrum', dest, amount: usdc.make(80_002_300n) },
        ],
      },
      targetAllocation: {
        Aave_Arbitrum: 0n,
        Compound_Arbitrum: 0n,
        [dest]: 100n,
      },
    },
  );
  await trader.openPortfolio(agent.proposeInitialAllocation(), 200_005_700n, {
    grantee: {
      address: AGENT_ADDRESS,
      permissions: harden({ allocation: { maxWeightBps: 6_000n } }),
    },
  });
  await pendingVstorageWrites();

  const before = await portfolioRead.getPortfolioStatus();
  await agent.redeem();
  await t.throwsAsync(agent.wake(), {
    message: /^mandate\.maxWeight:"Aave_Avalanche": portion/,
  });
  await pendingVstorageWrites();
  const after = await portfolioRead.getPortfolioStatus();
  t.is(after.flowCount, before.flowCount);
  t.is(after.policyVersion, before.policyVersion);
  t.is(after.rebalanceCount, before.rebalanceCount);
  t.deepEqual(after.flowsRunning, before.flowsRunning);
  t.deepEqual(after.targetAllocation, before.targetAllocation);
};

test(
  'delegated prompt-injected plan is rejected by the mandate',
  promptInjectionScenario,
);

test('delegated attested plan supplies execution steps', async t => {
  const {
    walletFactory,
    trader,
    portfolioRead,
    mcp,
    usdc,
    bld,
    cancelOpening,
  } = await setupTest(t);
  const agentWallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const amount = usdc.make(20_000_550n);
  const fee = bld.make(100n);
  const agent = makeAgent(
    { wallet: agentWallet, portfolioRead, mcp },
    {
      initialAllocation,
      plan: {
        flow: [
          {
            src: 'Aave_Arbitrum',
            dest: '@Arbitrum',
            amount,
            fee,
          },
          {
            src: '@Arbitrum',
            dest: 'Compound_Arbitrum',
            amount,
            fee,
          },
        ],
      },
      targetAllocation: {
        Aave_Arbitrum: 50n,
        Compound_Arbitrum: 50n,
        Aave_Avalanche: 0n,
      },
    },
  );
  await trader.openPortfolio(agent.proposeInitialAllocation(), 200_005_700n, {
    grantee: {
      address: AGENT_ADDRESS,
      permissions: harden({ allocation: { maxWeightBps: 6_000n } }),
    },
  });
  await pendingVstorageWrites();

  await cancelOpening();
  await agent.redeem();
  const flowKey = await agent.wake();
  await pendingVstorageWrites();

  const portfolioPath = publishedPortfolioPath(portfolioRead);
  const steps = await portfolioRead.readPublished(
    `${portfolioPath}.flows.${flowKey}.steps`,
  );
  t.like(steps, [
    { src: 'Aave_Arbitrum', dest: '@Arbitrum' },
    { src: '@Arbitrum', dest: 'Compound_Arbitrum' },
  ]);
});

test('agent redeems once and submits completed plans on successive wakes', async t => {
  const { walletFactory, trader, portfolioRead, mcpPowers, cancelOpening } =
    await setupTest(t);
  const agentWallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const mcp = makeMcp(
    mcpPowers,
    harden({
      balances: {
        '@agoric': 200_005_700n,
      },
      instrumentTvls: {},
    }),
  );
  const targetAllocation = harden({
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
    Aave_Avalanche: 0n,
  });
  const agent = makeAgent(
    { wallet: agentWallet, portfolioRead, mcp },
    { initialAllocation, targetAllocation, plan: { flow: [] } },
  );
  await trader.openPortfolio(agent.proposeInitialAllocation(), 200_005_700n, {
    grantee: {
      address: AGENT_ADDRESS,
      permissions: harden({ allocation: { maxWeightBps: 6_000n } }),
    },
  });
  await pendingVstorageWrites();
  await cancelOpening();
  await agent.redeem();

  const portfolioPath = publishedPortfolioPath(portfolioRead);
  const flowKeys = new Set<string>();
  for (let wake = 0; wake < 2; wake += 1) {
    const before = await portfolioRead.getPortfolioStatus();
    const flowKey = await agent.wake();
    t.false(flowKeys.has(flowKey));
    flowKeys.add(flowKey);
    await pendingVstorageWrites();
    t.like(
      await portfolioRead.readPublished(`${portfolioPath}.flows.${flowKey}`),
      {
        state: 'done',
        agent: 'agent1',
        initiatingOperation: { type: 'setTargetAllocation', status: 'ok' },
      },
    );
    const after = await portfolioRead.getPortfolioStatus();
    t.is(after.policyVersion, before.policyVersion + 1);
    t.deepEqual(after.targetAllocation, targetAllocation);
    t.false(flowKey in (after.flowsRunning ?? {}));
  }
});

test('delegated plan commits allocation after observation checks', async t => {
  const {
    walletFactory,
    trader,
    portfolioRead,
    mcpPowers,
    usdc,
    bld,
    cancelOpening,
  } = await setupTest(t);
  const agentWallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const mcp = makeMcp(
    mcpPowers,
    harden({
      balances: {
        '@agoric': 0n,
        '@Arbitrum': 0n,
        Aave_Arbitrum: 120_003_400n,
        Compound_Arbitrum: 80_002_300n,
      },
      instrumentTvls: {
        Aave_Arbitrum: { tvlUsd: 20_000n },
        Compound_Arbitrum: { tvlUsd: 20_000n },
      },
    }),
  );
  const amount = usdc.make(20_000_550n);
  const fee = bld.make(100n);
  const targetAllocation = harden({
    Aave_Arbitrum: 50n,
    Compound_Arbitrum: 50n,
    Aave_Avalanche: 0n,
  });
  const agent = makeAgent(
    { wallet: agentWallet, portfolioRead, mcp },
    {
      initialAllocation,
      plan: {
        flow: [
          { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee },
          { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount, fee },
        ],
      },
      targetAllocation,
    },
  );
  await trader.openPortfolio(agent.proposeInitialAllocation(), 200_005_700n, {
    grantee: {
      address: AGENT_ADDRESS,
      permissions: harden({
        allocation: { maxWeightBps: 6_000n, minVaultTvlUsd: 10_000n },
      }),
    },
  });
  await pendingVstorageWrites();

  await cancelOpening();
  await agent.redeem();
  await agent.wake();
  await pendingVstorageWrites();

  t.deepEqual(
    (await portfolioRead.getPortfolioStatus()).targetAllocation,
    targetAllocation,
  );
});

test('valid attested plan is rejected while the opening flow is active', async t => {
  const { walletFactory, trader, portfolioRead, mcpPowers, cancelOpening } =
    await setupTest(t);
  const mcp = makeMcp(
    mcpPowers,
    harden({
      balances: { '@agoric': 200_005_700n, '@Arbitrum': 0n },
      instrumentTvls: {},
    }),
  );
  const wallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const agent = makeAgent(
    { wallet, portfolioRead, mcp },
    {
      initialAllocation,
      targetAllocation: {
        Aave_Arbitrum: 60n,
        Compound_Arbitrum: 40n,
        Aave_Avalanche: 0n,
      },
      plan: { flow: [] },
    },
  );
  await trader.openPortfolio(agent.proposeInitialAllocation(), 200_005_700n, {
    grantee: {
      address: AGENT_ADDRESS,
      permissions: harden({ allocation: { maxWeightBps: 6_000n } }),
    },
  });
  await pendingVstorageWrites();
  await agent.redeem();
  const before = await portfolioRead.getPortfolioStatus();
  t.deepEqual(Object.keys(before.flowsRunning ?? {}), ['flow1']);
  await t.throwsAsync(agent.wake(), {
    message: 'portfolio already has a running flow',
  });
  await pendingVstorageWrites();
  t.deepEqual(await portfolioRead.getPortfolioStatus(), before);

  await cancelOpening();
  t.is(
    await agent.wake(),
    'flow2',
    'the same valid plan is admitted once idle',
  );
});
