/**
 * @file YMax portfolio contract — evmHandler.* operations
 *
 * Split from portfolio.contract.test.ts; shared helpers live in
 * contract-test-support.ts. Append new tests at the end for stable snapshots.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { type Bech32Address } from '@agoric/orchestration';
import { E } from '@endo/far';
import { hexToBytes } from '@noble/hashes/utils';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { contractsMock } from './mocks.ts';
import { predictRemoteAccountAddress } from '../src/utils/evm-orch-router.ts';
import {
  pendingTxOpts,
  snapshotTimed,
  documentStorageSchemaTimed,
  getRunningFlowEntries,
  resolveDepositPlan,
  setupPlanner,
  setupEvmPlanner,
  getPortfolioInfoTimed,
  makeEvmPlannerPowers,
  doOpenEvmPortfolio,
  keys,
  type RunningFlowKey,
} from './contract-test-support.ts';

test('evmHandler.withdraw starts a withdraw flow', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = !useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader } = powers;
    await doOpenEvmPortfolio(shared, inputs, powers);

    const statusBefore = await evmTrader.getPortfolioStatus();
    t.deepEqual(
      statusBefore.flowsRunning,
      {},
      `no flows running after ${label} deposit`,
    );
    t.truthy(statusBefore.sourceAccountId, `${label} sourceAccountId is set`);

    const withdrawDetails = {
      token: contractsMock[inputs.fromChain].usdc,
      amount: 500n,
    };
    const flowKey = await evmTrader
      .forChain(inputs.fromChain)
      .withdraw(withdrawDetails);
    t.regex(flowKey, /^flow\d+$/, `${label} withdraw returns a flow key`);

    const statusAfter = await evmTrader.getPortfolioStatus();
    t.like(
      statusAfter.flowsRunning,
      {
        [flowKey]: {
          type: 'withdraw',
          amount: { value: withdrawDetails.amount },
        },
      },
      `${label} withdraw flow is running`,
    );

    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

test.todo('evmHandler.withdraw fails if sourceAccountId not set');

test('evmHandler.deposit (existing Arbitrum) completes a deposit flow', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader } = powers;

    await doOpenEvmPortfolio(shared, inputs, powers);

    const statusBefore = await evmTrader.getPortfolioStatus();
    t.deepEqual(
      statusBefore.flowsRunning,
      {},
      `no flows running after ${label} deposit`,
    );
    t.truthy(statusBefore.sourceAccountId, `${label} sourceAccountId is set`);
    const portfolioRemoteAddress = statusBefore.accountIdByChain?.[
      inputs.fromChain
    ]
      ?.split(':')
      .at(-1);
    t.truthy(
      portfolioRemoteAddress,
      `${label} portfolio has a remote address on EVM`,
    );

    const newDepositAmount = usdc.units(500);
    const flowKey = (await evmTrader
      .forChain(inputs.fromChain)
      .deposit(
        newDepositAmount.value,
        portfolioRemoteAddress as `0x${string}`,
      )) as RunningFlowKey;
    t.regex(flowKey, /^flow\d+$/, `${label} deposit returns a flow key`);

    const statusAfter = await evmTrader.getPortfolioStatus();
    const flowsRunning = statusAfter.flowsRunning ?? {};
    t.is(keys(flowsRunning).length, 1, `${label} has one flow running`);

    const [[flowId, flowDetail]] = getRunningFlowEntries(flowsRunning);
    t.is(flowId, flowKey, `${label} flow key matches`);
    t.is(flowDetail.type, 'deposit', `${label} flow is a deposit`);
    if (flowDetail.type === 'deposit') {
      t.is(
        flowDetail.amount.value,
        newDepositAmount.value,
        `${label} deposit amount matches`,
      );
      t.is(
        flowDetail.fromChain,
        inputs.fromChain,
        `${label} fromChain matches`,
      );
    }

    const depositFlowNum = await resolveDepositPlan(
      { portfolioId: evmTrader.getPortfolioId() },
      powers,
    );
    t.is(`flow${depositFlowNum}`, flowKey, `${label} resolved flow matches`);

    const statusDone = await evmTrader.getPortfolioStatus();
    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    const flowHistory =
      contents[`${evmTrader.getPortfolioPath()}.flows.flow${depositFlowNum}`];
    t.truthy(
      Array.isArray(flowHistory) &&
        flowHistory.some(entry => entry?.state === 'done'),
      `${label} deposit flow history includes a done entry`,
    );
    t.deepEqual(
      statusDone.flowsRunning,
      {},
      `no flows running after ${label} deposit completes`,
    );

    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

// Test deposits from a NEW chain (where no account exists yet).
// For deposits to existing portfolios, spender must be the predicted smart wallet address
// (or depositFactory). The wallet is created via provideEVMAccount first.

test('evmHandler.deposit (Arbitrum -> Base) completes a deposit flow', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = !useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader } = powers;
    await doOpenEvmPortfolio(shared, inputs, powers);

    const statusBefore = await evmTrader.getPortfolioStatus();
    t.truthy(
      statusBefore.accountIdByChain?.[inputs.fromChain],
      `${label} has Arbitrum account`,
    );
    t.falsy(
      statusBefore.accountIdByChain?.Base,
      `${label} has no Base account yet`,
    );

    const lcaAddress = statusBefore.accountIdByChain?.agoric?.split(':').at(-1);
    t.truthy(lcaAddress, `${label} LCA address exists`);

    const newChain = 'Base' as const;
    const newChainContracts = contractsMock[newChain];
    const predictedSpender = useRouter
      ? predictRemoteAccountAddress({
          owner: lcaAddress as Bech32Address,
          factoryAddress: newChainContracts.remoteAccountFactory,
          implementationAddress: newChainContracts.remoteAccountImplementation,
        })
      : predictWalletAddress({
          owner: lcaAddress!,
          factoryAddress: newChainContracts.factory,
          gatewayAddress: newChainContracts.gateway,
          gasServiceAddress: newChainContracts.gasService,
          walletBytecode: hexToBytes('1234'),
        });

    const newDepositAmount = usdc.units(500);
    await t.throwsAsync(
      () =>
        evmTrader
          .forChain(newChain)
          .deposit(
            newDepositAmount.value,
            '0x2222222222222222222222222222222222222222',
          ),
      { message: /does not match/ },
      `${label} deposit rejects bad spender for new chain`,
    );

    const flowKey = (await evmTrader
      .forChain(newChain)
      .deposit(newDepositAmount.value, predictedSpender)) as RunningFlowKey;
    t.regex(flowKey, /^flow\d+$/, `${label} deposit returns a flow key`);

    const statusAfter = await evmTrader.getPortfolioStatus();
    const flowsRunning = statusAfter.flowsRunning ?? {};
    t.is(keys(flowsRunning).length, 1, `${label} has one flow running`);

    const [[flowId, flowDetail]] = getRunningFlowEntries(flowsRunning);
    t.is(flowId, flowKey, `${label} flow key matches`);
    t.is(flowDetail.type, 'deposit', `${label} flow is a deposit`);
    if (flowDetail.type === 'deposit') {
      t.is(
        flowDetail.amount.value,
        newDepositAmount.value,
        `${label} deposit amount matches`,
      );
      t.is(
        flowDetail.fromChain,
        newChain,
        `${label} fromChain is the new chain`,
      );
    }

    const depositFlowNum = await resolveDepositPlan(
      {
        portfolioId: evmTrader.getPortfolioId(),
        overrideTargetAllocation: { Aave_Base: 10000n },
        separateMakeAccount: true,
      },
      powers,
    );
    t.is(`flow${depositFlowNum}`, flowKey, `${label} flow key matches`);

    const statusDone = await evmTrader.getPortfolioStatus();
    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    const flowHistory =
      contents[`${evmTrader.getPortfolioPath()}.flows.flow${depositFlowNum}`];
    t.truthy(
      Array.isArray(flowHistory) &&
        flowHistory.some(entry => entry?.state === 'done'),
      `${label} deposit flow history should include a done entry`,
    );
    t.deepEqual(
      statusDone.flowsRunning,
      {},
      `no flows running after ${label} deposit completes`,
    );

    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

test('evmHandler.rebalance with target allocation sets allocation and starts a rebalance flow', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    initialAllocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
    rebalanceAllocations: [
      { instrument: 'Aave_Arbitrum', portion: 6000n },
      { instrument: 'Compound_Arbitrum', portion: 4000n },
    ],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader } = powers;
    await doOpenEvmPortfolio(
      shared,
      {
        fromChain: inputs.fromChain,
        depositAmount: inputs.depositAmount,
        allocations: inputs.initialAllocations,
      },
      powers,
    );

    t.like(await evmTrader.getPortfolioStatus(), {
      policyVersion: 1,
      rebalanceCount: 1,
    });

    const rebalanceFlowKey = await evmTrader
      .forChain(inputs.fromChain)
      .setTargetAllocation(inputs.rebalanceAllocations);
    t.regex(
      rebalanceFlowKey,
      /^flow\d+$/,
      `${label} rebalance returns a flow key`,
    );

    const statusAfter = await evmTrader.getPortfolioStatus();

    t.like(statusAfter, {
      policyVersion: 2,
      rebalanceCount: 0,
    });
    t.deepEqual(
      statusAfter.targetAllocation,
      { Aave_Arbitrum: 6000n, Compound_Arbitrum: 4000n },
      `${label} target allocation updated`,
    );
    t.like(
      statusAfter.flowsRunning,
      { [rebalanceFlowKey]: { type: 'rebalance' } },
      `${label} rebalance flow running`,
    );

    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

test('evmHandler.rebalance without target allocation uses existing allocation', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [
      { instrument: 'Aave_Arbitrum', portion: 6000n },
      { instrument: 'Compound_Arbitrum', portion: 4000n },
    ],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = !useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader } = powers;
    await doOpenEvmPortfolio(shared, inputs, powers);

    const statusBefore = await evmTrader.getPortfolioStatus();
    t.deepEqual(
      statusBefore.flowsRunning,
      {},
      `no flows running after ${label} deposit`,
    );
    t.like(statusBefore, {
      policyVersion: 1,
      rebalanceCount: 1,
    });

    const rebalanceFlowKey = await evmTrader
      .forChain(inputs.fromChain)
      .rebalance();
    t.regex(
      rebalanceFlowKey,
      /^flow\d+$/,
      `${label} rebalance returns a flow key`,
    );

    const statusAfter = await evmTrader.getPortfolioStatus();

    t.like(statusAfter, {
      policyVersion: 1,
      rebalanceCount: 1,
    });
    t.deepEqual(
      statusAfter.targetAllocation,
      statusBefore.targetAllocation,
      `${label} target allocation unchanged`,
    );
    t.like(
      statusAfter.flowsRunning,
      { [rebalanceFlowKey]: { type: 'rebalance' } },
      `${label} rebalance flow running`,
    );

    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

test('evmHandler.setAutoFeatures enables planner-initiated rebalance', async t => {
  const shared = await setupEvmPlanner(t);
  const { common } = shared;
  const { usdc, bld } = common.brands;
  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [
      { instrument: 'Aave_Arbitrum', portion: 6000n },
      { instrument: 'Compound_Arbitrum', portion: 4000n },
    ],
  };

  for (const [ix, useRouter] of [false, true].entries()) {
    const useVerifiedSigner = !useRouter;
    const { label, powers } = await makeEvmPlannerPowers(
      t,
      shared,
      ix,
      useRouter,
      useVerifiedSigner,
    );
    const { evmTrader, planner1 } = powers;

    await doOpenEvmPortfolio(shared, inputs, powers);
    await planner1.redeem();

    const autoFeatureStatus = await evmTrader
      .forChain(inputs.fromChain)
      .setAutoFeatures({ rebalance: true });
    t.is(autoFeatureStatus.status, 'ok', `${label} auto-feature message ok`);

    const statusBefore = await evmTrader.getPortfolioStatus();
    t.like(statusBefore, {
      enabledAutoFeatures: { rebalance: true },
      policyVersion: 1,
      rebalanceCount: 1,
    });

    const amount = usdc.units(100);
    const fee = bld.make(100n);
    const steps = [
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
    ];

    const syncState = {
      policyVersion: statusBefore.policyVersion,
      rebalanceCount: statusBefore.rebalanceCount,
    };

    const rebalanceFlowKey = await E(planner1.stub).rebalance(
      evmTrader.getPortfolioId(),
      { syncState },
      steps,
    );
    t.regex(
      rebalanceFlowKey,
      /^flow\d+$/,
      `${label} planner initiated rebalance returns flow key`,
    );

    for (const _ of steps) {
      await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
      await powers.txResolver.drainPending();
      await eventLoopIteration();
    }

    const statusAfter = await evmTrader.getPortfolioStatus();
    t.like(statusAfter, {
      enabledAutoFeatures: { rebalance: true },
      policyVersion: 1,
      rebalanceCount: 2,
    });
    t.deepEqual(
      statusAfter.flowsRunning,
      {},
      `no flows running after ${label} planner rebalance completes`,
    );

    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    const flowHistory =
      contents[`${evmTrader.getPortfolioPath()}.flows.${rebalanceFlowKey}`];
    t.truthy(
      Array.isArray(flowHistory) &&
        flowHistory.some(entry => entry?.state === 'done'),
      `${label} planner rebalance flow history includes a done entry`,
    );

    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});
