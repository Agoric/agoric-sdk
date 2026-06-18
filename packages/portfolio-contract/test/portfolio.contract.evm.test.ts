/**
 * @file YMax portfolio contract — EVM account opening, config & recovery
 *
 * Split from portfolio.contract.test.ts; shared helpers live in
 * contract-test-support.ts. Append new tests at the end for stable snapshots.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import assert from 'node:assert/strict';
import { AmountMath } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { type Bech32Address } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  TxType,
  type FundsFlowPlan,
  type PublishedPortfolioTxDetails,
  type PublishedTx,
  type TxId,
} from '@agoric/portfolio-api';
import { E, passStyleOf } from '@endo/far';
import { extractEvmRemoteAccountConfig } from '../src/portfolio.contract.ts';
import { type OfferArgsFor, type StatusFor } from '../src/type-guards.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import { makeCCTPTraffic } from './mocks.ts';
import { chainInfoWithCCTP, makeIncomingVTransferEvent } from './supports.ts';
import {
  pendingTxOpts,
  snapshotTimed,
  documentStorageSchemaTimed,
  getRunningFlowEntries,
  ackNFA,
  setupPlanner,
  setupEvmPlanner,
  getPortfolioInfoTimed,
  makeEvmPlannerPowers,
  doOpenEvmPortfolio,
  setupEvmRemoteAccountConfigTest,
  keys,
  values,
} from './contract-test-support.ts';

test.serial(
  'open 2 positions on an EVM chain, with a CCTP confirmation for each',
  async t => {
    const { trader1, common, txResolver } = await setupTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(6_666.66);
    const amountHalf = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);

    const actualP = trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          {
            src: '@noble',
            dest: '@Arbitrum',
            amount: amountHalf,
            fee: feeAcct,
          },
          {
            src: '@noble',
            dest: '@Arbitrum',
            amount: amountHalf,
            fee: feeAcct,
          },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration();
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    t.log('ackd send to Axelar to create account');

    await common.utils
      .transmitVTransferEvent('acknowledgementPacket', -1)
      .then(() => eventLoopIteration());

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );

    await common.utils
      .transmitVTransferEvent('acknowledgementPacket', -1)
      .then(() => eventLoopIteration());

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );

    const actual = await actualP;

    const result = actual.result as any;
    t.is(passStyleOf(result.invitationMakers), 'remotable');

    t.is(keys(result.publicSubscribers).length, 1);
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const { storage } = common.bootstrap;
    const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
    snapshotTimed(t, contents, 'vstorage');
    await documentStorageSchemaTimed(t, storage, pendingTxOpts);
    snapshotTimed(t, actual.payouts, 'refund payouts');
  },
);

test.serial('2 portfolios open EVM positions: parallel CCTP ack', async t => {
  const { trader1, common, txResolver, trader2 } = await setupTrader(
    t,
    undefined,
    undefined,
    { traderCount: 2 },
  );
  assert(trader2, 'trader2 defined with traderCount=2');
  const { usdc, bld, poc26 } = common.brands;

  // Portfolio1 (trader2) gets a different CREATE2 address than portfolio0 (trader1)
  // because they have different agoric local chain addresses
  const addr2 = {
    lca: makeTestAddress(3), // agoric1q...rytxkw
    nobleICA: 'noble1test1',
    evm: '0x9d935c48219d075735ea090130045d8693e6273f',
  } as const;
  const amount = usdc.units(3_333.33);

  for (const { msg, ack } of values(
    makeCCTPTraffic(addr2.nobleICA, `${amount.value}`, addr2.evm),
  )) {
    common.mocks.ibcBridge.addMockAck(msg, ack);
  }

  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const depositToAave: OfferArgsFor['openPortfolio'] = {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
    ],
  };
  const open1P = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    depositToAave,
  );

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  const open2P = trader2.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    depositToAave,
  );

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  await txResolver.drainPending();

  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -6);

  await txResolver.drainPending();

  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);

  const { storage } = common.bootstrap;
  for (const openP of [open1P, open2P]) {
    const { result, payouts } = await openP;
    t.deepEqual(payouts.Deposit, { brand: usdc.brand, value: 0n });
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
    snapshotTimed(t, contents, storagePath);
  }
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);
});

test('evmRemoteAccountConfig - extract bails if router address invalid', async t => {
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key) => (key === 'remoteAccountRouter' ? undefined : value),
  );

  const config = extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts);

  t.is(config, undefined);
});

test('evmRemoteAccountConfig - empty router config', async t => {
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key) => (key === 'remoteAccountRouter' ? '0x' : value),
  );

  const config = extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts);

  t.deepEqual(config?.currentRouterAddresses, {});
});

test('evmRemoteAccountConfig - partial router config', async t => {
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key, chain) =>
      key === 'remoteAccountRouter' && ['Optimism', 'Avalanche'].includes(chain)
        ? '0x'
        : value,
  );

  const config = extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts);

  t.deepEqual(config?.currentRouterAddresses, {
    Arbitrum: 'eip155:42161:0x4028686122Ae547e6B551C85962C5dA52db69743',
    Base: 'eip155:8453:0x4028686122Ae547e6B551C85962C5dA52db69743',
    Ethereum: 'eip155:1:0x4028686122Ae547e6B551C85962C5dA52db69743',
  });
});

test('evmRemoteAccountConfig - fails if invalid implementation', async t => {
  // even if router addresses config is empty, implementation addresses should be specified
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key) =>
      key === 'remoteAccountImplementation'
        ? undefined
        : key === 'remoteAccountRouter'
          ? '0x'
          : value,
  );

  t.throws(() =>
    extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts),
  );
});

test('evmRemoteAccountConfig - fails if invalid factory', async t => {
  // even if router addresses config is empty, factory addresses should be specified
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key) =>
      key === 'remoteAccountFactory'
        ? undefined
        : key === 'remoteAccountRouter'
          ? '0x'
          : value,
  );

  t.throws(() =>
    extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts),
  );
});

test('evmRemoteAccountConfig - fails if missing factory entry', async t => {
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key, chain) =>
      key === 'remoteAccountRouter' && ['Optimism', 'Avalanche'].includes(chain)
        ? '0x'
        : key === 'remoteAccountFactory' && ['Ethereum'].includes(chain)
          ? '0x'
          : value,
  );

  t.throws(
    () => extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts),
    {
      message: message =>
        message.includes('Ethereum') &&
        message.includes('remoteAccountFactory'),
    },
  );
});

test('evmRemoteAccountConfig - fails if missing implementation entry', async t => {
  const { chainIdToAxelarChain, contracts } = setupEvmRemoteAccountConfigTest(
    (value, key, chain) =>
      (key === 'remoteAccountFactory' || key === 'remoteAccountRouter') &&
      ['Optimism', 'Avalanche'].includes(chain)
        ? '0x'
        : key === 'remoteAccountImplementation' && ['Ethereum'].includes(chain)
          ? '0x'
          : value,
  );

  t.throws(
    () => extractEvmRemoteAccountConfig(chainIdToAxelarChain, contracts),
    {
      message: message =>
        message.includes('Ethereum') &&
        message.includes('remoteAccountImplementation'),
    },
  );
});

test('open portfolio from Arbitrum, 1000 USDC deposit', async t => {
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
  const expected = {
    positions: { Aave: usdc.units(600), Compound: usdc.units(400) },
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
    const openResult = await doOpenEvmPortfolio(shared, inputs, powers);

    t.is(
      openResult.storagePath,
      evmTrader.getPortfolioPath(),
      `${label} storage path matches`,
    );
    t.is(
      openResult.portfolioId,
      evmTrader.getPortfolioId(),
      `${label} portfolio id matches`,
    );

    const status = await evmTrader.getPortfolioStatus();
    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    const flowHistory =
      contents[
        `${evmTrader.getPortfolioPath()}.flows.flow${openResult.flowNum}`
      ];

    t.truthy(
      Array.isArray(flowHistory) &&
        flowHistory.some(entry => entry?.state === 'done'),
      `${label} flow history should include a done entry`,
    );
    t.deepEqual(
      status.flowsRunning,
      {},
      `${label} flowsRunning should be empty after plan completes`,
    );
    t.truthy(
      status.accountIdByChain?.Arbitrum,
      `${label} has Arbitrum account`,
    );
    t.is(status.positionKeys.length, 2, `${label} position count`);
    const expectedSourceAccountId =
      `eip155:${chainInfoWithCCTP[inputs.fromChain].reference}:${evmTrader.getAddress().toLowerCase()}` as const;
    t.is(
      status.sourceAccountId,
      expectedSourceAccountId,
      `${label} sourceAccountId from vstorage`,
    );
    t.is(
      contents[evmTrader.getPortfolioPath()]?.sourceAccountId,
      expectedSourceAccountId,
      `${label} sourceAccountId in storage contents`,
    );
    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );

    const posKey = `${evmTrader.getPortfolioPath()}.positions`;
    const posBalances = {
      Aave: contents[`${posKey}.Aave_Arbitrum`]?.totalIn,
      Compound: contents[`${posKey}.Compound_Arbitrum`]?.totalIn,
    };
    t.deepEqual(posBalances, expected.positions, `${label} position balances`);
  }
});

test('open portfolio from Base with @Base allocation', async t => {
  const shared = await setupPlanner(t);
  const { common } = shared;
  const { usdc } = common.brands;
  const inputs = {
    fromChain: 'Base' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: '@Base', portion: 10000n }],
  };
  const expected = {
    targetAllocation: { '@Base': 10000n },
  } as const;

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
    const openResult = await doOpenEvmPortfolio(shared, inputs, powers);

    t.is(
      openResult.storagePath,
      evmTrader.getPortfolioPath(),
      `${label} storage path matches`,
    );
    t.is(
      openResult.portfolioId,
      evmTrader.getPortfolioId(),
      `${label} portfolio id matches`,
    );

    const status = await evmTrader.getPortfolioStatus();
    const { contents } = getPortfolioInfoTimed(
      t,
      evmTrader.getPortfolioPath(),
      common.bootstrap.storage,
    );
    const flowHistory =
      contents[
        `${evmTrader.getPortfolioPath()}.flows.flow${openResult.flowNum}`
      ];

    t.truthy(
      Array.isArray(flowHistory) &&
        flowHistory.some(entry => entry?.state === 'done'),
      `${label} flow history should include a done entry`,
    );
    t.deepEqual(
      status.flowsRunning,
      {},
      `${label} flowsRunning should be empty after plan completes`,
    );
    t.truthy(status.accountIdByChain?.Base, `${label} has Base account`);
    t.deepEqual(status.positionKeys, [], `${label} has no positions`);
    t.deepEqual(
      status.targetAllocation,
      expected.targetAllocation,
      `${label} target allocation matches`,
    );
    const expectedSourceAccountId =
      `eip155:${chainInfoWithCCTP[inputs.fromChain].reference}:${evmTrader.getAddress().toLowerCase()}` as const;
    t.is(
      status.sourceAccountId,
      expectedSourceAccountId,
      `${label} sourceAccountId from vstorage`,
    );
    t.is(
      contents[evmTrader.getPortfolioPath()]?.sourceAccountId,
      expectedSourceAccountId,
      `${label} sourceAccountId in storage contents`,
    );
    snapshotTimed(t, contents, `vstorage (${label})`);
    await documentStorageSchemaTimed(
      t,
      common.bootstrap.storage,
      pendingTxOpts,
    );
  }
});

test('verifies fix for p772 & p775: make-account recovery after prior failed make-account flow', async t => {
  const { common, planner1, readPublished, txResolver, evmTrader } =
    await setupEvmPlanner(t);
  const { usdc, bld } = common.brands;

  const inputs = {
    fromChain: 'Base' as const,
    otherSuccessChain: 'Arbitrum' as const,
    otherFailedChain: 'Optimism' as const,
    depositAmount: usdc.units(1000),
    allocations: [
      { instrument: 'Aave_Base', portion: 4000n },
      { instrument: 'Aave_Arbitrum', portion: 4000n },
      { instrument: 'Aave_Optimism', portion: 2000n },
    ],
  };
  const {
    fromChain,
    otherSuccessChain,
    otherFailedChain,
    depositAmount,
    allocations,
  } = inputs;

  const expected = {
    portfolioId: 0,
    storagePath: `${ROOT_STORAGE_PATH}.portfolios.portfolio0`,
  };

  await planner1.redeem();

  const openResult = await (async () => {
    const result = await evmTrader
      .forChain(fromChain)
      .openPortfolio(allocations, depositAmount.value);
    t.is(result.storagePath, expected.storagePath);
    t.is(result.portfolioId, expected.portfolioId);
    await ackNFA(common.utils);
    return result;
  })();

  const findPendingTxInfo = async () => {
    const txIds = await txResolver.findPending();
    const infos = await Promise.all(
      txIds.map(async txId => {
        const info = (await readPublished(
          `pendingTxs.${txId}`,
        )) as StatusFor['pendingTx'];
        return { txId, ...info };
      }),
    );
    // Ignore IBC_FROM_AGORIC txs that are never handled curently
    return infos.filter(info => info.type !== TxType.IBC_FROM_AGORIC);
  };

  const submitDepositPlan = async (expectedValue: bigint) => {
    const status = await evmTrader.getPortfolioStatus();
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowKey, detail]] = getRunningFlowEntries(flowsRunning);
    const flowId = Number(flowKey.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    t.is(detail.amount.value, expectedValue);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const totalPortion = allocations.reduce(
      (sum, { portion }) => sum + portion,
      0n,
    );
    const allocationTargets = Object.fromEntries(
      allocations.map(({ instrument, portion }) => [
        instrument,
        AmountMath.make(
          usdc.brand,
          (portion * detail.amount.value) / totalPortion,
        ),
      ]),
    );
    const CCTPAmount = AmountMath.add(
      allocationTargets[`Aave_${otherSuccessChain}`],
      allocationTargets[`Aave_${otherFailedChain}`],
    );
    const plan: FundsFlowPlan = {
      flow: [
        {
          src: `+${fromChain}`,
          dest: `@${fromChain}`,
          amount: planDepositAmount,
          fee,
        },
        {
          src: `@${fromChain}`,
          dest: `Aave_${fromChain}`,
          amount: allocationTargets[`Aave_${fromChain}`],
          fee,
        },
        {
          src: `@${fromChain}`,
          dest: `@agoric`,
          amount: CCTPAmount,
          fee,
        },
        {
          src: `@agoric`,
          dest: `@noble`,
          amount: CCTPAmount,
          fee,
        },
        {
          src: `@noble`,
          dest: `@${otherSuccessChain}`,
          amount: allocationTargets[`Aave_${otherSuccessChain}`],
          fee,
        },
        {
          src: `@noble`,
          dest: `@${otherFailedChain}`,
          amount: allocationTargets[`Aave_${otherFailedChain}`],
          fee,
        },
        {
          src: `@${otherFailedChain}`,
          dest: `Aave_${otherFailedChain}`,
          amount: allocationTargets[`Aave_${otherFailedChain}`],
          fee,
        },
        {
          src: `@${otherSuccessChain}`,
          dest: `Aave_${otherSuccessChain}`,
          amount: allocationTargets[`Aave_${otherSuccessChain}`],
          fee,
        },
      ],
      order: [
        [1, [0]],
        [2, [0]],
        [3, [2]],
        [4, [3]],
        [5, [3]],
        [6, [5]],
        [7, [4]],
      ],
    };
    await E(planner1.stub).resolvePlan(
      openResult.portfolioId,
      flowId,
      plan,
      ...sync,
    );
    return { flowId, allocationTargets };
  };

  const { flowId: flow1Num } = await submitDepositPlan(depositAmount.value);

  const chainFromIds = Object.fromEntries(
    Object.entries(chainInfoWithCCTP).map(([chain, info]) => [
      info.reference,
      chain,
    ]),
  );

  const getTxIdByChain = (infos: (PublishedTx & { txId: TxId })[]) =>
    Object.fromEntries(
      infos.map(info => [
        chainFromIds[
          parseAccountId(
            (info as PublishedPortfolioTxDetails).destinationAddress!,
          ).reference
        ],
        info.txId,
      ]),
    );

  // Drive flow1 until make-account pending tx is visible, then fail it.
  const flow1TxId = await (async () => {
    // Send the make-account IBC transfer acks
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -3);

    const flowsInfo = await findPendingTxInfo();
    t.like(
      flowsInfo,
      [
        { type: TxType.MAKE_ACCOUNT },
        { type: TxType.MAKE_ACCOUNT },
        { type: TxType.MAKE_ACCOUNT },
      ],
      'flow1 has 3 pending make-account txs',
    );

    const txIdByChain = getTxIdByChain(flowsInfo);

    // one chain settles before the failing deposit make-account
    await txResolver.settleTransaction(
      txIdByChain[otherSuccessChain],
      'success',
    );
    await eventLoopIteration();

    // The deposit fails
    await txResolver.settleTransaction(txIdByChain[fromChain], 'failed');
    await eventLoopIteration();

    // Resolve the last make-account but after
    await txResolver.settleTransaction(
      txIdByChain[otherFailedChain],
      'success',
    );
    await eventLoopIteration();

    return txIdByChain[fromChain];
  })();

  const pendingTxAfterFlow1 = await findPendingTxInfo();
  t.deepEqual(
    pendingTxAfterFlow1,
    [],
    'no pending tx after flow1 make-account failure settles',
  );

  const statusAfterFlow1 = await evmTrader.getPortfolioStatus();

  const { contents: contentsAfterFlow1 } = getPortfolioInfoTimed(
    t,
    openResult.storagePath!,
    common.bootstrap.storage,
  );

  snapshotTimed(t, contentsAfterFlow1, 'after flow 1');
  await documentStorageSchemaTimed(t, common.bootstrap.storage, pendingTxOpts);

  const flow1History =
    contentsAfterFlow1[`${openResult.storagePath}.flows.flow${flow1Num}`];

  t.truthy(
    Array.isArray(flow1History) &&
      flow1History.some(entry => entry?.state === 'fail'),
    'flow history should include a failed entry',
  );
  t.deepEqual(
    statusAfterFlow1.flowsRunning,
    {},
    'flowsRunning should be empty after flow1 fails',
  );
  // XXX: if we ever change the flow implementation to stay active while tx are
  // pending, this check would need to change
  t.deepEqual(
    statusAfterFlow1.accountsPending,
    [otherFailedChain],
    'other failed account is pending after flow1 failure',
  );

  // Start flow2 from same chain/account context.
  const remoteAddress = statusAfterFlow1.accountIdByChain[fromChain]
    ? (parseAccountId(statusAfterFlow1.accountIdByChain[fromChain])
        .accountAddress as `0x${string}`)
    : undefined;
  t.truthy(remoteAddress, 'Remote address exists');

  const flow2Amount = usdc.units(500);
  const flow2Key = await evmTrader
    .forChain(fromChain)
    .deposit(flow2Amount.value, remoteAddress);
  t.regex(flow2Key, /^flow\d+$/, 'deposit returns a flow key');

  const statusAfterFlow2Start = await evmTrader.getPortfolioStatus();

  t.deepEqual(
    statusAfterFlow2Start.accountsPending,
    [],
    'other failed account is no longer pending after flow2 starts (but is failed)',
  );

  const { allocationTargets: flow2AllocationTargets } = await submitDepositPlan(
    flow2Amount.value,
  );

  const findFailedMakeAccountTx = () => {
    const paths = [...common.bootstrap.storage.data.keys()].filter(path =>
      path.includes('.pendingTxs.tx'),
    );
    return paths
      .map(path => {
        const tx = common.bootstrap.storage.getDeserialized(path).at(-1) as any;
        return { txId: path.split('.').at(-1), ...tx };
      })
      .filter(
        tx => tx?.status === 'failed' && tx?.type === TxType.MAKE_ACCOUNT,
      );
  };

  await eventLoopIteration();
  const failedMakeAccountTx = findFailedMakeAccountTx();
  t.is(failedMakeAccountTx.length, 1, 'only original make-account failed tx');
  t.like(failedMakeAccountTx[0], { txId: flow1TxId });

  await (async () => {
    // Step 0: Base and Optimism makeAccount
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    const step0Pending = await findPendingTxInfo();
    t.is(step0Pending.length, 2);
    t.like(
      step0Pending,
      [{ type: TxType.MAKE_ACCOUNT }, { type: TxType.MAKE_ACCOUNT }],
      'two make-account pending',
    );
    await txResolver.settleTransaction(step0Pending[0].txId, 'success');
    await txResolver.settleTransaction(step0Pending[1].txId, 'success');
    await eventLoopIteration();

    // Step 1:depositFromEVM GMP call to Axelar
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    const step1Pending = await findPendingTxInfo();
    t.is(step1Pending.length, 1);
    t.like(step1Pending, [{ type: TxType.GMP }], 'one GMP pending');
    await txResolver.settleTransaction(step1Pending[0].txId, 'success');
    await eventLoopIteration();

    // Step 2 & 3: GMP for Aave_Base and CCTP to Agoric
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    const step23Pending = await findPendingTxInfo();
    const gmpStep23 = step23Pending.filter(info => info.type === TxType.GMP);
    t.is(gmpStep23.length, 2);
    await txResolver.settleTransaction(gmpStep23[0].txId, 'success');
    await txResolver.settleTransaction(gmpStep23[1].txId, 'success');
    await eventLoopIteration();

    // Step 3: CCTP Transfer In
    const step3Pending = await findPendingTxInfo();
    t.is(step3Pending.length, 1);
    t.like(
      step3Pending,
      [{ type: TxType.CCTP_TO_AGORIC }],
      'one CCTP transfer in',
    );
    const cctpInfo = step3Pending[0] as PublishedPortfolioTxDetails;
    const cctpDestination = parseAccountId(cctpInfo.destinationAddress!);
    const fwdEvent = makeIncomingVTransferEvent({
      sender: statusAfterFlow1.nobleForwardingAddress!,
      sourceChannel:
        chainInfoWithCCTP.noble.connections['agoric-3'].transferChannel
          .channelId,
      destinationChannel:
        chainInfoWithCCTP.noble.connections['agoric-3'].transferChannel
          .counterPartyChannelId,
      target: cctpDestination.accountAddress,
      receiver: cctpDestination.accountAddress as Bech32Address,
      amount: cctpInfo.amount,
    });
    await E(common.mocks.transferBridge).fromBridge(fwdEvent);
    await eventLoopIteration();

    // Setup the acks for the Step 5 & 6 CCTP Out
    const traffic = [otherFailedChain, otherSuccessChain].flatMap(chain =>
      values(
        makeCCTPTraffic(
          parseAccountId(statusAfterFlow1.accountIdByChain.noble!)
            .accountAddress,
          `${flow2AllocationTargets[`Aave_${chain}`].value}`,
          parseAccountId(statusAfterFlow1.accountIdByChain[chain]!)
            .accountAddress,
          chainInfoWithCCTP[chain].cctpDestinationDomain,
        ),
      ),
    );
    for (const { msg, ack } of traffic) {
      common.mocks.ibcBridge.addMockAck(msg, ack);
    }

    // Step 4: IBC to Noble
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

    // Step 5 & 6: CCTP transfer out to Arbitrum & Optimism
    const step56Pending = await findPendingTxInfo();
    t.is(step56Pending.length, 2);
    t.like(
      step56Pending,
      [{ type: TxType.CCTP_TO_EVM }, { type: TxType.CCTP_TO_EVM }],
      'two CCTP transfers out',
    );
    const cctpTxIdByChain = getTxIdByChain(step56Pending);
    // Ack Step 5
    await txResolver.settleTransaction(
      cctpTxIdByChain[otherFailedChain],
      'success',
    );
    await eventLoopIteration();

    // Step 8: GMP Call for Aave Optimism
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    const step8Pending = await findPendingTxInfo();
    t.is(step8Pending.length, 2);
    t.like(
      step8Pending,
      [
        { type: TxType.CCTP_TO_EVM, txId: cctpTxIdByChain[otherSuccessChain] },
        { type: TxType.GMP },
      ],
      'only one GMP pending after single CCTP ack',
    );

    // Ack Step 6
    await txResolver.settleTransaction(
      cctpTxIdByChain[otherSuccessChain],
      'success',
    );
    await eventLoopIteration();

    // Step 7: GMP Call for Aave Arbitrum
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    const step7Pending = await findPendingTxInfo();
    t.is(step7Pending.length, 2);
    t.like(
      step7Pending,
      [{ type: TxType.GMP, txId: step8Pending[1].txId }, { type: TxType.GMP }],
      'both GMP now pending',
    );
    await txResolver.settleTransaction(step7Pending[1].txId, 'success');
    await eventLoopIteration();

    // Ack Step 8
    await txResolver.settleTransaction(step8Pending[1].txId, 'success');
    await eventLoopIteration();
  })();

  const statusAfterFlow2 = await evmTrader.getPortfolioStatus();

  const { contents: contentsAfterFlow2 } = getPortfolioInfoTimed(
    t,
    openResult.storagePath!,
    common.bootstrap.storage,
  );

  snapshotTimed(t, contentsAfterFlow2, 'after flow 2');
  await documentStorageSchemaTimed(t, common.bootstrap.storage, pendingTxOpts);

  const pendingTxAfterFlow2 = await findPendingTxInfo();
  t.deepEqual(
    pendingTxAfterFlow2,
    [],
    'no pending tx after second flow completes',
  );

  const flow2History =
    contentsAfterFlow2[`${openResult.storagePath}.flows.${flow2Key}`];

  t.truthy(
    Array.isArray(flow2History) &&
      flow2History.some(entry => entry?.state === 'done'),
    'flow history should include a done entry',
  );
  t.deepEqual(
    statusAfterFlow2.flowsRunning,
    {},
    'flowsRunning should be empty after flow2 completes',
  );

  const failedPosition = (await readPublished(
    `portfolios.portfolio0.positions.Aave_${otherFailedChain}`,
  )) as any;
  t.not(
    failedPosition.totalIn.value,
    0n,
    'position for recovered failed remote account',
  );

  t.deepEqual(
    statusAfterFlow2.accountsPending,
    [],
    'no accounts left pending after flow2 success',
  );

  // XXX: At this level we cannot (yet) check that the from account is no longer failed
  // we could observe that another flow does not trigger another make-account.
});
