/** @file YMax portfolio contract — customer-agent supplied plans. */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import assert from 'node:assert/strict';

import { makeExpectUnhandledRejectionMacro } from '@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js';
import { eventLoopIteration as pendingVstorageWrites } from '@agoric/internal/src/testing-utils.js';
import type { PortfolioDelegatedSetTargetAllocationParams } from '@agoric/portfolio-api';
import type { TargetAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { NameAdmin } from '@agoric/vats';
import type { Invitation, Proposal, ZoeService } from '@agoric/zoe';
import { E, Far } from '@endo/far';
import type { ExecutionContext } from 'ava';
import {
  goodSig,
  type PortfolioDelegationClient,
} from '../src/delegation.exo.ts';
import { deploy, makeEvmTraderKit } from './contract-setup.ts';
import { evmTrader0PrivateKey } from './mocks.ts';

const expectUnhandled = makeExpectUnhandledRejectionMacro({
  test,
  importMetaUrl: import.meta.url,
});

const AGENT_ADDRESS = 'agoric1andrewAgent' as const;
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
type Attestation = NonNullable<
  PortfolioDelegatedSetTargetAllocationParams['attestation']
>;
type Mcp = {
  // AGO-1298: hosted MCP obtains signed observations; the agent only forwards them.
  attest: (portfolioId: PortfolioId) => Promise<Attestation>;
};

const makeMcp = (
  getExpectedPortfolioId: () => PortfolioId,
  observations: Attestation['observations'] = harden({
    balances: {
      Aave_Arbitrum: 120_003_400n,
      Compound_Arbitrum: 80_002_300n,
    },
    instrumentTvls: {},
  }),
): Mcp =>
  harden({
    async attest(portfolioId: PortfolioId) {
      assert.equal(portfolioId, getExpectedPortfolioId());
      return harden({
        observations,
        signature: goodSig,
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
  return harden({
    proposeInitialAllocation: () => initialAllocation,
    async wake() {
      const delegationClient =
        await wallet.executeOffer<PortfolioDelegationClient>();
      const before = await portfolioRead.getPortfolioStatus();
      const attestation = await mcp.attest(portfolioRead.getPortfolioId());
      const submitted = harden({
        syncState: {
          policyVersion: before.policyVersion,
          rebalanceCount: before.rebalanceCount,
        },
        targetAllocation,
        plan,
        attestation,
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
  const deployed = await deploy(t);
  const { zoe, common } = deployed;
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
  const mcp = makeMcp(() => portfolioRead.getPortfolioId());

  return harden({
    walletFactory,
    trader,
    portfolioRead,
    mcp,
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
  const { walletFactory, trader, portfolioRead, mcp, usdc } =
    await setupTest(t);
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
  const flowKey = await agent.wake();
  await pendingVstorageWrites();

  const portfolioPath = publishedPortfolioPath(portfolioRead);
  const outcome = await portfolioRead.readPublished(
    `${portfolioPath}.flows.${flowKey}`,
  );
  t.like(outcome, {
    state: 'fail',
    agent: 'agent1',
    error: 'mandate.maxWeight:"Aave_Avalanche"',
  });
  t.deepEqual(
    (await portfolioRead.getPortfolioStatus()).targetAllocation,
    before.targetAllocation,
  );
};

test(
  'delegated prompt-injected plan is rejected by the mandate',
  expectUnhandled(1),
  promptInjectionScenario,
);

test('delegated attested plan supplies execution steps', async t => {
  const { walletFactory, trader, portfolioRead, mcp, usdc, bld } =
    await setupTest(t);
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

test('delegated plan commits allocation after observation checks', async t => {
  const { walletFactory, trader, portfolioRead, usdc, bld } =
    await setupTest(t);
  const agentWallet = await walletFactory.provideSmartWallet(AGENT_ADDRESS);
  const mcp = makeMcp(
    () => portfolioRead.getPortfolioId(),
    harden({
      balances: {
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

  await agent.wake();
  await pendingVstorageWrites();

  t.deepEqual(
    (await portfolioRead.getPortfolioStatus()).targetAllocation,
    targetAllocation,
  );
});
