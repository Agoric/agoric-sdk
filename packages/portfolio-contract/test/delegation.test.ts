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
import type { PortfolioStatus } from './contract-test-support.ts';

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

const getSyncState = ({
  policyVersion,
  rebalanceCount,
}: Pick<PortfolioStatus, 'policyVersion' | 'rebalanceCount'>) =>
  harden({ policyVersion, rebalanceCount });

const stripRootStoragePath = (path: string) =>
  path.replace(new RegExp(`^(${ROOT_STORAGE_PATH}|published)\\.`), '');

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
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation({
    targetAllocation: {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    syncState: getSyncState(before),
    agentMemo: '12345',
  });
  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const portfolioPath = stripRootStoragePath(
    peteKit.evmTrader.getPortfolioPath(),
  ) as `ymax${'0' | '1'}.portfolios.portfolio${number}`;
  const portfolioStatus = await peteKit.evmTrader.getPortfolioStatus();
  t.is(portfolioStatus.flowsRunning?.[rebalanceFlowId]?.agent, 'agent1');
  t.is(portfolioStatus.flowsRunning?.[rebalanceFlowId]?.agentMemo, '12345');
  const agents = await peteKit.readPublished(`${portfolioPath}.agents`);
  t.deepEqual(agents, {
    agent1: {
      grantee: PETE_AGENT,
      permissions: { allocation: true },
      state: 'active',
      // the initial deposit/rebalance flow bumps policyVersion to 1, then
      // grant() itself bumps it again
      updatedAtPolicyVersion: 2,
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
  const rebalanceP = E(delegationClient).setTargetAllocation({
    targetAllocation: {
      Aave_Arbitrum: 60n,
      Aave_Base: 40n,
    },
    syncState: getSyncState(before),
  });

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
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation({
    targetAllocation: {
      Aave_Arbitrum: 100n,
      Compound_Arbitrum: 0n,
    },
    syncState: getSyncState(before),
  });

  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 100n,
    Compound_Arbitrum: 0n,
  });
});

test('Delegation is active only while registered on the portfolio', async t => {
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

  const portfolioPath = stripRootStoragePath(
    peteKit.evmTrader.getPortfolioPath(),
  ) as `ymax${'0' | '1'}.portfolios.portfolio${number}`;
  const agents = await peteKit.readPublished(`${portfolioPath}.agents`);
  t.deepEqual(agents, {
    agent1: {
      grantee: PETE_AGENT,
      permissions: { allocation: true },
      state: 'active',
      // the initial deposit/rebalance flow bumps policyVersion to 1, then
      // grant() itself bumps it again
      updatedAtPolicyVersion: 2,
    },
  });

  const before = await peteKit.evmTrader.getPortfolioStatus();
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation({
    targetAllocation: {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    syncState: getSyncState(before),
  });
  t.regex(String(rebalanceFlowId), /^flow\d+$/);
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
    harden({ allocation: true }),
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

test('Pete may open a portfolio and grant control in a single signed message', async t => {
  const deployed = await deploy(t);
  const { zoe } = deployed;

  // The agent's deposit facet is registered so the grant can be delivered.
  const receiver = await registerDepositFacet(
    deployed.common.bootstrap.namesByAddressAdmin,
    PETE_AGENT,
  );
  const peteKit = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader0PrivateKey,
  });
  const peteArbitrum = peteKit.evmTrader.forChain('Arbitrum');

  // One user signature: create the portfolio AND grant allocation control to
  // the agent, replacing the former two-step OpenPortfolio + Grant flow.
  const { portfolioId } = await peteArbitrum.openPortfolioWithGrant(
    [
      { instrument: 'Aave_Arbitrum', portion: 60n },
      { instrument: 'Compound_Arbitrum', portion: 40n },
    ],
    10_000_000n,
    PETE_AGENT,
    harden({ allocation: true }),
  );
  await eventLoopIteration();

  // The combined operation delivered the delegation as part of the same call.
  // (openPortfolioWithGrant only resolves once the contract's
  // openPortfolioFromEVM has awaited the grant, so success here implies the
  // grant succeeded; a rejected grant would have failed the whole message.)
  const { delegationClient } = await redeemAndCheckDelegation({
    t,
    zoe,
    grantStatus: { status: 'ok' },
    receiver,
    expectedDetails: {
      portfolioId,
      agentId: 'agent1',
      permissions: { allocation: true },
    },
  });

  // The published agents record reflects the delegation.
  const portfolioPath = stripRootStoragePath(
    peteKit.evmTrader.getPortfolioPath(),
  ) as `ymax${'0' | '1'}.portfolios.portfolio${number}`;
  const agents = await peteKit.readPublished(`${portfolioPath}.agents`);
  t.deepEqual(agents, {
    agent1: {
      grantee: PETE_AGENT,
      permissions: { allocation: true },
      state: 'active',
      // grant() runs before the deposit/rebalance flow starts, so this is
      // the portfolio's first policyVersion bump
      updatedAtPolicyVersion: 1,
    },
  });

  // The grant is live end-to-end: the grantee rebalances through the redeemed
  // delegation facet, proving the single-message open+grant produced a usable
  // delegation.
  const before = await peteKit.evmTrader.getPortfolioStatus();
  const rebalanceFlowId = await E(delegationClient).setTargetAllocation({
    targetAllocation: {
      Aave_Arbitrum: 50n,
      Compound_Arbitrum: 50n,
    },
    syncState: getSyncState(before),
    agentMemo: '67890',
  });
  t.regex(String(rebalanceFlowId), /^flow\d+$/);

  await eventLoopIteration();
  const after = await peteKit.evmTrader.getPortfolioStatus();
  t.deepEqual(after.targetAllocation, {
    Aave_Arbitrum: 50n,
    Compound_Arbitrum: 50n,
  });
});

test('open+grant with an unregistered grantee aborts before portfolio creation', async t => {
  const deployed = await deploy(t);

  // Deliberately do NOT register a depositFacet for PETE_AGENT. A standalone
  // Grant surfaces this NamesByAddress miss non-fatally (see the "Grant
  // delivery failure is surfaced ..." test above); in the combined flow the
  // smart-wallet depositFacet is preflighted before a portfolio kit is
  // allocated, so the same caller-triggerable failure aborts the whole
  // open+grant operation without orphaning a portfolio shell.
  const peteKit = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader0PrivateKey,
  });
  const peteArbitrum = peteKit.evmTrader.forChain('Arbitrum');
  const walletAddress = peteKit.evmAccount.address;

  await t.throwsAsync(
    peteArbitrum.openPortfolioWithGrant(
      [
        { instrument: 'Aave_Arbitrum', portion: 60n },
        { instrument: 'Compound_Arbitrum', portion: 40n },
      ],
      10_000_000n,
      PETE_AGENT,
      harden({ allocation: true }),
    ),
    { message: /"nameKey" not found: "agoric1petesAgent"/ },
    'combined open+grant rejects when the grantee is not registered',
  );
  await eventLoopIteration();

  // The failed message is recorded on the wallet as an error, not silently
  // swallowed.
  const walletStatus = (await peteKit.readPublished(
    `evmWallets.${walletAddress}`,
  )) as { status: string; error?: string };
  t.is(walletStatus.status, 'error');
  t.regex(walletStatus.error || '', /"nameKey" not found: "agoric1petesAgent"/);

  // The funding flow never started and the portfolio kit was never allocated:
  // the wallet's portfolio path is published only by
  // OpenOutcomeWatcher.onFulfilled (when openPortfolioFromEVM resolves), so
  // its absence pins the ordering invariant. This is an indirect proxy for "no
  // deposit pulled": the deposit is drawn inside the funding flow, which is
  // never reached here.
  await t.throwsAsync(
    peteKit.readPublished(`evmWallets.${walletAddress}.portfolio`),
    { message: /no data at path/ },
    'no portfolio path is published for the wallet after the aborted open+grant',
  );

  await t.throwsAsync(peteKit.readPublished('portfolios.portfolio0'), {
    message: /no data at path/,
  });
});
