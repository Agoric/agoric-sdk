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
import type { PortfolioDelegationClient } from '../src/delegation.exo.ts';
import { deploy, makeEvmTraderKit } from './contract-setup.ts';
import { evmTrader0PrivateKey } from './mocks.ts';

const PETE_AGENT = 'agoric1petesAgent' as const;
type Deployed = Awaited<ReturnType<typeof deploy>>;
type Receiver<R> = ReturnType<typeof makeDepositFacetSpy<R>>;
type ExpectedDelegationDetails = {
  portfolioId: number;
  agentId: `agent${number}`;
  permissions: { allocation: true };
};

const emptyProposal = harden({ give: {}, want: {} }) as Proposal;
const delegationDocOpts = {
  pattern: `${ROOT_STORAGE_PATH}.`,
  replacement: 'published.',
  node: 'portfolios.portfolio0',
  owner: 'ymax',
  showValue: defaultSerializer.parse,
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
  ] as const,
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
    harden({ allocation: true }),
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
    harden({ allocation: true }),
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
    message: /granted rebalance must preserve allocation key set/,
  });

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 60n,
    Compound_Arbitrum: 40n,
  });
});

test('Grant rejects allocation permission set to false', async t => {
  const deployed = await deploy(t);
  const { peteArbitrum } = await openPetePortfolio(deployed);

  const grantStatus = await peteArbitrum.grant(
    PETE_AGENT,
    harden({ allocation: false }),
  );

  t.is(grantStatus.status, 'error');
  if (!('error' in grantStatus)) {
    t.fail('expected error detail on failed grant');
    return;
  }
  t.regex(grantStatus.error || '', /grant requires allocation permission/);
});
