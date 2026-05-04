/**
 * @file YMax portfolio contract tests - user stories
 *
 * For easier snapshot review, add new tests at the end of this file.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { NatAmount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { fromTypedEntries, objectMap, typedEntries } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema as rawDocumentStorageSchema,
  type makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import {
  eventLoopIteration,
  inspectMapStore,
  testInterruptedSteps,
  type TestStep,
} from '@agoric/internal/src/testing-utils.js';
import type { Bech32Address } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  AxelarChain,
  InstrumentId,
  TxType,
  type FundsFlowPlan,
  type PublishedPortfolioTxDetails,
  type PublishedTx,
  type TxId,
} from '@agoric/portfolio-api';
import type { TargetAllocation as PermittedAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { E, passStyleOf } from '@endo/far';
import { hexToBytes } from '@noble/hashes/utils';
import type { ExecutionContext } from 'ava';
import assert from 'node:assert/strict';
import {
  extractEvmRemoteAccountConfig,
  makeEip155ChainIdToAxelarChain,
  type EVMContractAddresses,
  type PortfolioPrivateArgs,
} from '../src/portfolio.contract.ts';
import type { AssetPlaceRef } from '../src/type-guards-steps.ts';
import type {
  OfferArgsFor,
  StatusFor,
  TargetAllocation,
} from '../src/type-guards.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { makeWallet } from '../tools/wallet-offer-tools.ts';
import {
  deploy,
  makeEvmTraderKit,
  provideMakePrivateArgs,
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import {
  contractsMock,
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
  makeCCTPTraffic,
  portfolio0lcaOrch,
} from './mocks.ts';
import {
  chainInfoWithCCTP,
  makeIncomingVTransferEvent,
  makeStorageTools,
} from './supports.ts';
import { timeAsync, timeSync } from './test-timing.ts';
import { predictRemoteAccountAddress } from '../src/utils/evm-orch-router.ts';

const { fromEntries, keys, values } = Object;

const evmTraderPrivateKeys = [
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
] as const;

const range = (n: number) => [...Array(n).keys()];

type FakeStorage = ReturnType<typeof makeFakeStorageKit>;
type PortfolioStatus = StatusFor['portfolio'];
type RunningFlows = NonNullable<PortfolioStatus['flowsRunning']>;
type RunningFlowKey = keyof RunningFlows;
type RunningFlowDetail = RunningFlows[RunningFlowKey];
type EvmTraderKit = Awaited<ReturnType<typeof makeEvmTraderKit>>;
type DirectPlannerClient = ReturnType<typeof makeDirectPlannerClient>;

const pendingTxOpts = {
  pattern: `${ROOT_STORAGE_PATH}.`,
  replacement: 'published.',
  node: `pendingTxs`,
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

const snapshotTimed = (t: ExecutionContext, value: unknown, message?: string) =>
  timeSync(t, `snapshot${message ? `:${message}` : ''}`, () =>
    t.snapshot(value, message),
  );

const documentStorageSchemaTimed = (
  t: ExecutionContext,
  storage: Parameters<typeof rawDocumentStorageSchema>[1],
  opts: Parameters<typeof rawDocumentStorageSchema>[2],
) =>
  timeAsync(t, 'documentStorageSchema', () =>
    rawDocumentStorageSchema(t, storage, opts),
  );

const getRunningFlowEntries = (
  flowsRunning: RunningFlows = {},
): [RunningFlowKey, RunningFlowDetail][] =>
  Object.entries(flowsRunning) as [RunningFlowKey, RunningFlowDetail][];

const getTargetAllocationEntries = (
  targetAllocation: TargetAllocation,
): [InstrumentId, bigint][] =>
  Object.entries(targetAllocation) as [InstrumentId, bigint][];

const getFlowHistory = (
  portfolioKey: string,
  flowCount: number,
  storage: FakeStorage,
) => {
  const flowPaths = range(flowCount).map(
    ix => `${portfolioKey}.flows.flow${ix + 1}`,
  );
  const flowEntries: [string, StatusFor['flow'][]][] = flowPaths.flatMap(p =>
    storage.data.has(p) ? [[p, storage.getDeserialized(p)]] : [],
  );
  const stepsEntries = flowPaths
    .map(fp => `${fp}.steps`)
    .flatMap(fsp =>
      storage.data.has(fsp) ? [[fsp, storage.getDeserialized(fsp).at(-1)]] : [],
    );
  const zipped = flowEntries.flatMap((e, ix) => [e, stepsEntries[ix]]);
  return {
    flowPaths,
    byFlow: fromEntries(zipped),
  };
};

/** current vstorage for portfolio, positions; full history for flows */
const getPortfolioInfo = (key: string, storage: FakeStorage) => {
  const info: StatusFor['portfolio'] = storage.getDeserialized(key).at(-1);
  const { positionKeys, flowCount } = info;
  const posPaths = positionKeys.map(k => `${key}.positions.${k}`);
  const posEntries = posPaths.map(p => [p, storage.getDeserialized(p).at(-1)]);
  const { flowPaths, byFlow } = getFlowHistory(key, flowCount, storage);
  const contents = {
    ...fromEntries([[key, info], ...posEntries]),
    ...byFlow,
  };
  return { contents, positionPaths: posPaths, flowPaths };
};

const ackNFA = (utils, ix = 0) =>
  utils.transmitVTransferEvent('acknowledgementPacket', ix);

const makeDirectPlannerClient = (zoe, creatorFacet) => {
  let planner;
  return harden({
    redeem: async () => {
      const invitation = await E(creatorFacet).makePlannerInvitation();
      const seat = await E(zoe).offer(invitation);
      planner = await E(seat).getOfferResult();
    },
    get stub() {
      assert(planner);
      return planner;
    },
  });
};

const resolveDepositPlan = async (
  {
    portfolioId: pId,
    overrideTargetAllocation,
    separateMakeAccount,
  }: {
    portfolioId: number;
    overrideTargetAllocation?: TargetAllocation;
    separateMakeAccount?: boolean;
  },
  powers: Pick<
    Awaited<ReturnType<typeof setupPlanner>>,
    'planner1' | 'txResolver' | 'common'
  > & {
    evmTrader: EvmTraderKit['evmTrader'];
  },
) => {
  const { planner1, evmTrader, txResolver, common } = powers;
  const { usdc, bld } = common.brands;

  const status = await evmTrader.getPortfolioStatus();
  const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
  const targetAllocation = overrideTargetAllocation ?? status.targetAllocation;
  const [[flowKey, detail]] = getRunningFlowEntries(flowsRunning);
  if (detail.type !== 'deposit')
    throw new Error(`Unexpected flow ${detail.type}`);

  const fromChain = detail.fromChain! as AxelarChain;
  if (!fromChain) throw new Error('deposit detail missing fromChain');
  if (!(fromChain in contractsMock)) {
    throw new Error(`unexpected fromChain for EVM deposit: ${fromChain}`);
  }

  const totalAllocation = getTargetAllocationEntries(targetAllocation!).reduce(
    (sum, [instrument, portion]) => {
      if (
        instrument !== `@${fromChain}` &&
        !instrument.endsWith(`_${fromChain}`)
      )
        throw new Error(
          `Test allocation instrument ${instrument} must stay on deposit chain ${fromChain}`,
        );
      return sum + portion;
    },
    0n,
  );

  const sync = [policyVersion, rebalanceCount] as const;
  const flowId = Number(flowKey.replace('flow', ''));
  const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
  const fee = bld.units(100);
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: `+${fromChain}`,
        dest: `@${fromChain}`,
        amount: planDepositAmount,
        fee,
      },
      ...Object.entries(targetAllocation!).flatMap(
        ([instrument, portion]: [InstrumentId | `@${AxelarChain}`, bigint]) =>
          instrument === `@${fromChain}`
            ? []
            : ({
                src: `@${fromChain}`,
                dest: instrument,
                amount: AmountMath.make(
                  usdc.brand,
                  (portion * planDepositAmount.value) / totalAllocation,
                ),
                fee,
              } as const),
      ),
    ],
  };
  await E(planner1.stub).resolvePlan(pId, flowId, plan, ...sync);

  // The contract will issue a separate GMP for make account, not accounted in
  // the steps above, so ack it.
  if (separateMakeAccount) {
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
  }

  for (const _ of plan.flow) {
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
  }

  return flowId;
};

test('open portfolio with USDN position', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const doneP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: 'USDN', amount },
      ],
    },
  );

  // ack IBC transfer for NFA, forward
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const done = await doneP;
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  t.like(result.publicSubscribers, {
    portfolio: {
      description: 'Portfolio',
      storagePath: `${ROOT_STORAGE_PATH}.portfolios.portfolio0`,
    },
  });
  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);

  // let vstorage settle since our mocks don't fully resolve IBC.
  await txResolver.drainPending();
  const { storage } = common.bootstrap;
  const { contents, positionPaths } = getPortfolioInfoTimed(
    t,
    storagePath,
    storage,
  );
  snapshotTimed(t, contents, 'vstorage');
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);

  t.log(
    'I can see where my money is:',
    positionPaths.map(p => contents[p].accountId),
  );
  t.is(contents[positionPaths[0]].accountId, `cosmos:noble-1:noble1test`);
  t.is(
    contents[storagePath].accountIdByChain.agoric,
    `cosmos:agoric-3:${portfolio0lcaOrch}`,
    'LCA',
  );
  snapshotTimed(t, done.payouts, 'refund payouts');
});

test('open a portfolio with Aave position', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const portfolioP = (async () => {
    const amount = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);
    const detail = { evmGas: 175n };

    return trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct, detail },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
    );
  })();

  const chainP = (async () => {
    await ackNFA(common.utils);
    // Acknowledge Axelar makeAccount - it's the second-to-last transfer
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await simulateCCTPAck(common.utils);
    const misc = await txResolver.drainPending();
    // Acknowledge Aave GMP call to Axelar
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    return misc;
  })();

  const [actual, misc] = await Promise.all([portfolioP, chainP]);

  t.log('=== Portfolio completed. resolved:', misc);
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
});

test('open a portfolio with Compound position', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { bld, usdc, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const actualP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      Deposit: amount,
    },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount, fee: feeCall },
      ],
    },
  );

  await eventLoopIteration(); // let IBC message go out
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  t.log('ackd NFA, send to Axelar to create account');

  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );

  t.log('=== Waiting for portfolio completion and CCTP confirmation ===');
  const actual = await actualP;

  t.log('=== Portfolio completed');
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
});

test('open portfolio with USDN, Aave positions', async t => {
  const { trader1, common, contractBaggage, txResolver } = await setupTrader(t);
  const { bld, usdc, poc26 } = common.brands;

  const { add } = AmountMath;
  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const doneP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      Deposit: add(amount, amount),
    },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount: add(amount, amount) },
        { src: '@agoric', dest: '@noble', amount: add(amount, amount) },
        { src: '@noble', dest: 'USDN', amount },

        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    },
  );

  await eventLoopIteration(); // let outgoing IBC happen
  t.log('openPortfolio, eventloop');
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  t.log('ackd NFA, send to noble');

  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );

  const done = await doneP;

  t.log('=== Portfolio completed');
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { storage } = common.bootstrap;
  const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
  snapshotTimed(t, contents, 'vstorage');
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);
  snapshotTimed(t, done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree.chainHub; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  snapshotTimed(t, tree, 'baggage after open with positions');
});

test('contract rejects unknown pool keys', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const amount = usdc.units(1000);

  // Try to open portfolio with unknown pool key
  const rejectionP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        // @ts-expect-error testing Unknown pool key
        { src: '@noble', dest: 'Aave_Noble', amount },
      ],
    },
  );

  await t.throwsAsync(rejectionP, {
    message: /Must match one of|Aave_Base/i,
  });
});

test('open portfolio with target allocations', async t => {
  const { trader1, common, contractBaggage } = await setupTrader(t);
  const { poc26 } = common.brands;

  const targetAllocation = {
    USDN: 1n,
    Aave_Arbitrum: 1n,
    Compound_Arbitrum: 1n,
  };
  const doneP = trader1.openPortfolio(
    t,
    { Access: poc26.make(1n) },
    { targetAllocation },
  );
  await ackNFA(common.utils);

  const done = await doneP;
  const result = done.result as any;
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const info = await trader1.getPortfolioStatus();
  t.deepEqual(info.targetAllocation, targetAllocation);

  snapshotTimed(t, info, 'portfolio');
  snapshotTimed(t, done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree.chainHub; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  snapshotTimed(t, tree, 'baggage after open with target allocations');
});

test('claim rewards on Aave position successfully', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const actualP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    },
  );

  await eventLoopIteration(); // let IBC message go out
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  t.log('ackd send to Axelar to create account');

  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );

  const done = await actualP;

  t.log('=== Portfolio completed');
  const result = done.result as any;

  const { storagePath } = result.publicSubscribers.portfolio;
  const messagesBefore = common.utils.inspectLocalBridge();

  const rebalanceP = trader1.rebalance(
    t,
    { give: { Deposit: amount }, want: {} },
    {
      flow: [
        {
          dest: '@Arbitrum',
          src: 'Aave_Arbitrum',
          amount: usdc.make(100n),
          fee: feeCall,
          claim: true,
        },
      ],
    },
  );

  await txResolver.drainPending();

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const rebalanceResult = await rebalanceP;
  t.log('rebalance done', rebalanceResult);

  const messagesAfter = common.utils.inspectLocalBridge();

  t.deepEqual(messagesAfter.length - messagesBefore.length, 2);

  t.log(storagePath);
  const { storage } = common.bootstrap;
  const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
  snapshotTimed(t, contents, 'vstorage');
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);

  snapshotTimed(t, rebalanceResult.payouts, 'rebalance payouts');
});

test('USDN claim fails currently', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const doneP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: 'USDN', amount },
      ],
    },
  );

  // ack IBC transfer for forward
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const done = await doneP;
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  t.like(result.publicSubscribers, {
    portfolio: {
      description: 'Portfolio',
      storagePath: 'orchtest.portfolios.portfolio0',
    },
  });
  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);

  // let vstorage settle since our mocks don't fully resolve IBC.
  await txResolver.drainPending();
  const { storage } = common.bootstrap;
  const { contents, positionPaths } = getPortfolioInfoTimed(
    t,
    storagePath,
    storage,
  );
  snapshotTimed(t, contents, 'vstorage');
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);

  t.log(
    'I can see where my money is:',
    positionPaths.map(p => contents[p].accountId),
  );
  t.is(contents[positionPaths[0]].accountId, `cosmos:noble-1:noble1test`);
  t.is(
    contents[storagePath].accountIdByChain.agoric,
    `cosmos:agoric-3:${portfolio0lcaOrch}`,
    'LCA',
  );

  const rebalanceRet = await trader1.rebalance(
    t,
    { give: {}, want: {} },
    {
      flow: [
        {
          dest: '@noble',
          src: 'USDN',
          amount: usdc.make(100n),
          claim: true,
        },
      ],
    },
  );

  t.deepEqual(rebalanceRet, {
    result: 'flow2',
    payouts: {},
  });

  const portfolioInfo = getPortfolioInfoTimed(t, storagePath, storage);
  const flowInfo =
    portfolioInfo.contents[`${storagePath}.flows.${rebalanceRet.result}`];
  snapshotTimed(t, flowInfo, 'flow info after failed claim');
  t.is(flowInfo.at(-1).error, 'claiming USDN is not supported');
});

const beefyTestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, txResolver } = await setupTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);

    const actualP = trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
          { src: '@Arbitrum', dest: vaultKey, amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration(); // let IBC message go out
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    t.log('ackd send to Axelar to create account');

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );
    const actual = await actualP;

    t.log('=== Portfolio completed');
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
  title(providedTitle = '', vaultKey: AssetPlaceRef) {
    return `${providedTitle} ${vaultKey}`.trim();
  },
});

test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_re7_Avalanche',
);
test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_compoundUsdc_Optimism',
);
test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_compoundUsdc_Arbitrum',
);
test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_morphoGauntletUsdc_Ethereum',
);
test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_morphoSmokehouseUsdc_Ethereum',
);
test(
  'open a portfolio with Beefy vault:',
  beefyTestMacro,
  'Beefy_morphoSeamlessUsdc_Base',
);

test('Withdraw from a Beefy position (future client)', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const actualP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Beefy_re7_Avalanche', amount, fee: feeCall },
      ],
    },
  );

  await eventLoopIteration(); // let IBC message go out
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  t.log('ackd send to Axelar to create account');

  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );
  const actual = await actualP;

  const result = actual.result as any;

  const withdrawP = trader1.rebalance(
    t,
    { give: {}, want: {} },
    {
      flow: [
        {
          src: 'Beefy_re7_Avalanche',
          dest: '@Arbitrum',
          amount,
          fee: feeCall,
        },
        {
          src: '@Arbitrum',
          dest: '@agoric',
          amount,
        },
        {
          src: '@agoric',
          dest: '<Cash>',
          amount,
        },
      ],
    },
  );

  // GMP transaction settlement for the withdraw
  await txResolver.drainPending();

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );

  const withdraw = await withdrawP;

  const { storagePath } = result.publicSubscribers.portfolio;
  const { storage } = common.bootstrap;
  const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
  snapshotTimed(t, contents, 'vstorage');
  await documentStorageSchemaTimed(t, storage, pendingTxOpts);
  snapshotTimed(t, withdraw.payouts, 'refund payouts');
});

test('portfolios node updates for each new portfolio', async t => {
  const { makeFundedTrader, common } = await setupTrader(t);
  const { poc26 } = common.brands;
  const { storage } = common.bootstrap;

  const give = { Access: poc26.make(1n) };
  {
    const trader = await makeFundedTrader();
    await Promise.all([
      trader.openPortfolio(t, give),
      ackNFA(common.utils, -1),
    ]);
    const x = storage.getDeserialized(`${ROOT_STORAGE_PATH}.portfolios`).at(-1);
    t.deepEqual(x, { addPortfolio: `portfolio0` });
  }
  {
    const trader = await makeFundedTrader();
    await Promise.all([
      trader.openPortfolio(t, give),
      ackNFA(common.utils, -1),
    ]);
    const x = storage.getDeserialized(`${ROOT_STORAGE_PATH}.portfolios`).at(-1);
    t.deepEqual(x, { addPortfolio: `portfolio1` });
  }
});

// baggage after a simple startInstance, without any other startup logic
test('initial baggage', async t => {
  const { contractBaggage } = await setupTrader(t);

  const tree = inspectMapStore(contractBaggage);
  snapshotTimed(t, tree, 'contract baggage after start');
  // CCTP Confirmation Tests
});

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

test('start deposit more to same', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, poc26 } = common.brands;

  const targetAllocation = {
    USDN: 60n,
    Aave_Arbitrum: 40n,
  };
  await Promise.all([
    trader1.openPortfolio(t, { Access: poc26.make(1n) }, { targetAllocation }),
    ackNFA(common.utils),
  ]);

  const amount = usdc.units(3_333.33);
  await trader1.rebalance(
    t,
    { give: { Deposit: amount }, want: {} },
    {
      flow: [{ src: '<Deposit>', dest: '+agoric', amount }],
    },
  );

  const info = await trader1.getPortfolioStatus();
  t.deepEqual(
    info.depositAddress,
    makeTestAddress(2), // ...64vywd
  );
});

const setupPlanner = async (
  t: ExecutionContext,
  overrides: Partial<
    PortfolioPrivateArgs & {
      useRouter: boolean;
      useVerifiedSigner: boolean;
      includeEvmKit: boolean;
    }
  > = {},
): Promise<
  Awaited<ReturnType<typeof setupTrader>> & {
    planner1: DirectPlannerClient;
    readPublished: ReturnType<typeof makeStorageTools>['readPublished'];
  } & Partial<EvmTraderKit>
> => {
  const {
    useRouter,
    useVerifiedSigner,
    includeEvmKit = false,
    ...restOverrides
  } = overrides;
  const {
    common,
    zoe,
    started,
    makeFundedTrader,
    trader1,
    txResolver,
    timerService,
    contractBaggage,
  } = await timeAsync(t, 'setupPlanner:setupTrader', () =>
    setupTrader(t, undefined, restOverrides),
  );
  const { storage } = common.bootstrap;
  const { readPublished } = makeStorageTools(storage);
  const planner1 = makeDirectPlannerClient(zoe, started.creatorFacet);
  const evmKit = includeEvmKit
    ? await timeAsync(t, 'setupPlanner:makeEvmTraderKit', () =>
        makeEvmTraderKit(
          {
            common,
            zoe,
            started,
            timerService,
            contractBaggage,
          },
          {
            useRouter,
            useVerifiedSigner,
          },
        ),
      )
    : {};
  return {
    common,
    zoe,
    started,
    makeFundedTrader,
    trader1,
    planner1,
    readPublished,
    txResolver,
    timerService,
    contractBaggage,
    ...evmKit,
  };
};

const setupEvmPlanner = async (
  t,
  overrides: Partial<PortfolioPrivateArgs & { useRouter: boolean }> = {},
): Promise<Awaited<ReturnType<typeof setupPlanner>> & EvmTraderKit> => {
  const powers = await setupPlanner(t, { ...overrides, includeEvmKit: true });
  assert(powers.evmTrader);
  assert(powers.evmAccount);
  return powers as Awaited<ReturnType<typeof setupPlanner>> & EvmTraderKit;
};

const getPortfolioInfoTimed = (
  t: ExecutionContext,
  key: string,
  storage: FakeStorage,
) => timeSync(t, 'getPortfolioInfo', () => getPortfolioInfo(key, storage));

const makeEvmPlannerPowers = async (
  t: ExecutionContext,
  shared: Awaited<ReturnType<typeof setupPlanner>>,
  ix: number,
  useRouter: boolean,
  useVerifiedSigner: boolean,
) => {
  const baseLabel = useRouter ? 'routed' : 'legacy';
  const label = useVerifiedSigner ? `${baseLabel} - smart account` : baseLabel;
  const planner1 = makeDirectPlannerClient(
    shared.zoe,
    shared.started.creatorFacet,
  );
  const evmKit = await timeAsync(t, `makeEvmTraderKit:${label}`, () =>
    makeEvmTraderKit(shared, {
      useRouter,
      useVerifiedSigner,
      privateKey: evmTraderPrivateKeys[ix],
    }),
  );
  return { label, powers: { ...shared, planner1, ...evmKit } };
};

const doOpenEvmPortfolio = async (
  shared: Awaited<ReturnType<typeof setupPlanner>>,
  inputs: {
    fromChain: AxelarChain;
    depositAmount: NatAmount;
    allocations: PermittedAllocation[];
  },
  powers: Awaited<ReturnType<typeof makeEvmPlannerPowers>>['powers'],
) => {
  const { planner1, evmTrader } = powers;

  await planner1.redeem();
  const result = await evmTrader
    .forChain(inputs.fromChain)
    .openPortfolio(inputs.allocations, inputs.depositAmount.value);
  await ackNFA(shared.common.utils, -1);
  await eventLoopIteration();
  const flowNum = await resolveDepositPlan(
    { portfolioId: evmTrader.getPortfolioId() },
    powers,
  );

  return { ...result, flowNum };
};

test('redeem, use planner invitation', async t => {
  const { common, trader1, planner1 } = await setupPlanner(t);

  await planner1.redeem();

  await Promise.all([trader1.openPortfolio(t, {}, {}), ackNFA(common.utils)]);
  const { usdc } = common.brands;
  const Deposit = usdc.units(3_333.33);
  await trader1.rebalance(
    t,
    { give: { Deposit }, want: {} },
    { flow: [{ src: '<Deposit>', dest: '+agoric', amount: Deposit }] },
  );
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 1,
    rebalanceCount: 0,
  });

  await E(planner1.stub).submit(0, [], 1);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 1,
    rebalanceCount: 1,
  });
});

test('address of LCA for fees is published', async t => {
  const { common } = await deploy(t);
  const {
    bootstrap: { storage },
    utils: { makePrivateArgs },
  } = common;
  await eventLoopIteration();
  const info = storage.getDeserialized(`${ROOT_STORAGE_PATH}`).at(-1);
  t.log(info);
  const contracts = makePrivateArgs().contracts;
  t.deepEqual(info, {
    contractAccount: makeTestAddress(0),
    depositFactoryAddresses: {
      Arbitrum: `eip155:42161:${contracts.Arbitrum.depositFactory}`,
      Avalanche: `eip155:43114:${contracts.Avalanche.depositFactory}`,
      Base: `eip155:8453:${contracts.Base.depositFactory}`,
      Ethereum: `eip155:1:${contracts.Ethereum.depositFactory}`,
      Optimism: `eip155:10:${contracts.Optimism.depositFactory}`,
    },
    evmRemoteAccountConfig: {
      currentRouterAddresses: {
        Arbitrum: 'eip155:42161:0x4028686122Ae547e6B551C85962C5dA52db69743',
        Avalanche: 'eip155:43114:0x4028686122Ae547e6B551C85962C5dA52db69743',
        Base: 'eip155:8453:0x4028686122Ae547e6B551C85962C5dA52db69743',
        Ethereum: 'eip155:1:0x4028686122Ae547e6B551C85962C5dA52db69743',
        Optimism: 'eip155:10:0x4028686122Ae547e6B551C85962C5dA52db69743',
      },
      factoryAddresses: {
        Arbitrum: 'eip155:42161:0x7F649a200382A9b909989168A7fF5a87B8aea189',
        Avalanche: 'eip155:43114:0x7F649a200382A9b909989168A7fF5a87B8aea189',
        Base: 'eip155:8453:0x7F649a200382A9b909989168A7fF5a87B8aea189',
        Ethereum: 'eip155:1:0x7F649a200382A9b909989168A7fF5a87B8aea189',
        Optimism: 'eip155:10:0x7F649a200382A9b909989168A7fF5a87B8aea189',
      },
      remoteAccountImplementationAddresses: {
        Arbitrum: 'eip155:42161:0x19b1c8917bd8A51CD25FCB43c50E4184EDA29c13',
        Avalanche: 'eip155:43114:0x19b1c8917bd8A51CD25FCB43c50E4184EDA29c13',
        Base: 'eip155:8453:0x19b1c8917bd8A51CD25FCB43c50E4184EDA29c13',
        Ethereum: 'eip155:1:0x19b1c8917bd8A51CD25FCB43c50E4184EDA29c13',
        Optimism: 'eip155:10:0x19b1c8917bd8A51CD25FCB43c50E4184EDA29c13',
      },
    },
  });
});

const setupEvmRemoteAccountConfigTest = (
  mapContractEntry: (
    value: `0x${string}` | undefined,
    key: keyof EVMContractAddresses,
    chain: AxelarChain,
  ) => `0x${string}` | undefined = value => value,
) => {
  const makePrivateArgs = provideMakePrivateArgs({} as any, undefined as any);
  const { chainInfo, contracts: originalContracts } = makePrivateArgs();
  const chainIdToAxelarChain = makeEip155ChainIdToAxelarChain(chainInfo);

  const contracts = objectMap(
    originalContracts,
    (addresses, chain) =>
      fromTypedEntries(
        typedEntries(addresses).flatMap(([key, value]) => {
          const mappedValue = mapContractEntry(
            value,
            key as keyof EVMContractAddresses,
            chain,
          );
          return mappedValue ? [[key, mappedValue]] : [];
        }),
      ) as EVMContractAddresses,
  );

  return {
    chainIdToAxelarChain,
    contracts,
  };
};

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

test('request rebalance - send same targetAllocation', async t => {
  const { common, trader1, planner1 } = await setupPlanner(t);

  await planner1.redeem();

  const targetAllocation: TargetAllocation = {
    Aave_Avalanche: 60n,
    Compound_Arbitrum: 40n,
  };
  await Promise.all([
    trader1.openPortfolio(t, {}, { targetAllocation }),
    ackNFA(common.utils),
  ]);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 1,
    rebalanceCount: 0,
  });
  const { usdc } = common.brands;
  const Deposit = usdc.units(3_333.33);
  t.log('trader1 deposits', Deposit, targetAllocation);
  await trader1.rebalance(
    t,
    { give: { Deposit }, want: {} },
    { flow: [{ src: '<Deposit>', dest: '+agoric', amount: Deposit }] },
  );
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 2,
    rebalanceCount: 0,
  });

  t.log('planner carries out (empty) deposit plan');
  const mockPlan = [];
  await E(planner1.stub).submit(0, mockPlan, 2);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 2,
    rebalanceCount: 1,
  });

  t.log('user requests rebalance after yield makes things unbalanced');
  await trader1.rebalance(t, { give: {}, want: {} }, { targetAllocation });
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 3,
    rebalanceCount: 0,
  });

  t.log('planner carries out (empty) rebalance plan');
  await E(planner1.stub).submit(0, mockPlan, 3);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 3,
    rebalanceCount: 1,
  });
});

test('withdraw using planner', async t => {
  const { common, trader1, planner1 } = await setupPlanner(t);

  await planner1.redeem();
  await Promise.all([trader1.openPortfolio(t, {}, {}), ackNFA(common.utils)]);
  const pId: number = trader1.getPortfolioId();
  const { usdc } = common.brands;
  const Deposit = usdc.units(3_333.33);
  const depP = trader1.rebalance(
    t,
    { give: { Deposit }, want: {} },
    { flow: [{ src: '<Deposit>', dest: '@agoric', amount: Deposit }] },
  );
  await depP;
  t.log('trader deposited', Deposit);

  const traderP = (async () => {
    const Cash = multiplyBy(Deposit, parseRatio(0.25, usdc.brand));
    await trader1.withdraw(t, Cash);
    t.log('trader withdrew', Cash);
  })();

  const plannerP = (async () => {
    const {
      flowsRunning = {},
      policyVersion,
      rebalanceCount,
    } = await trader1.getPortfolioStatus();
    t.log('flowsRunning', flowsRunning);
    t.is(keys(flowsRunning).length, 1);
    const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
    const fId = Number(flowId.replace('flow', ''));

    // narrow the type
    if (detail.type !== 'withdraw') throw t.fail(detail.type);

    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = AmountMath.make(Deposit.brand, detail.amount.value);

    const plan: FundsFlowPlan = {
      flow: [{ src: '@agoric', dest: '<Cash>', amount }],
    };
    await E(planner1.stub).resolvePlan(
      pId,
      fId,
      plan,
      policyVersion,
      rebalanceCount,
    );
    t.log('planner resolved plan');
  })();

  await Promise.all([traderP, plannerP]);

  const bankTraffic = common.utils.inspectBankBridge();
  const { accountIdByChain } = await trader1.getPortfolioStatus();
  const [_ns, _ref, addr] = accountIdByChain.agoric!.split(':');
  const myVBankIO = bankTraffic.filter(obj =>
    [obj.sender, obj.recipient].includes(addr),
  );
  t.log('bankBridge for', addr, myVBankIO);
  t.like(myVBankIO, [
    { type: 'VBANK_GIVE', amount: '3333330000' },
    { type: 'VBANK_GRAB', amount: '833332500' },
  ]);
  t.is(833332500n, (3333330000n * 25n) / 100n);
});

test('creatorFacet.withdrawFees', async t => {
  const { started, common } = await setupTrader(t);
  const { storage } = common.bootstrap;
  const { inspectLocalBridge } = common.utils;

  const { contractAccount } = storage
    .getDeserialized(`${ROOT_STORAGE_PATH}`)
    .at(-1) as unknown as { contractAccount: string };
  t.log('contractAddress for fees', contractAccount);

  const { bld } = common.brands;
  const bld2k = bld.units(2_000);
  {
    const pmt = await common.utils.pourPayment(bld2k);
    const { bankManager } = common.bootstrap;
    const bank = E(bankManager).getBankForAddress(contractAccount);
    const purse = E(bank).getPurse(bld2k.brand);
    await E(purse).deposit(pmt);
    t.log('deposited', bld2k, 'for fees');
  }

  const { creatorFacet } = started;

  const dest = `cosmos:agoric-3:${makeTestAddress(5)}` as const;

  {
    const actual = await E(creatorFacet).withdrawFees(dest, {
      denom: 'ubld',
      value: 100n,
    });
    t.log('withdrew some', actual);

    t.deepEqual(actual, { denom: 'ubld', value: 100n });

    const [tx] = inspectLocalBridge().filter(
      obj => obj.type === 'VLOCALCHAIN_EXECUTE_TX',
    );
    t.like(tx.messages[0], {
      '@type': '/cosmos.bank.v1beta1.MsgSend',
      fromAddress: 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
      toAddress: 'agoric1q5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8ee25y',
      amount: [{ denom: 'ubld', amount: '100' }],
    });
  }

  {
    const amt = await E(creatorFacet).withdrawFees(dest);

    t.log('withdrew all', amt);
    t.deepEqual(amt, { denom: 'ubld', value: bld2k.value });

    const [_, tx] = inspectLocalBridge().filter(
      obj => obj.type === 'VLOCALCHAIN_EXECUTE_TX',
    );
    t.like(tx.messages[0], {
      '@type': '/cosmos.bank.v1beta1.MsgSend',
      fromAddress: 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
      toAddress: 'agoric1q5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8ee25y',
      amount: [{ denom: 'ubld', amount: '2000000000' }],
    });
  }
});

test('deposit using planner', async t => {
  const { common, trader1, planner1 } = await setupPlanner(t);

  await planner1.redeem();
  await Promise.all([trader1.openPortfolio(t, {}, {}), ackNFA(common.utils)]);
  const pId: number = trader1.getPortfolioId();
  const { usdc } = common.brands;
  const Deposit = usdc.units(1_000);

  const traderP = (async () => {
    await trader1.deposit(t, Deposit);
    t.log('trader deposited', Deposit);
  })();

  const plannerP = (async () => {
    const {
      flowsRunning = {},
      policyVersion,
      rebalanceCount,
    } = await trader1.getPortfolioStatus();
    t.log('flowsRunning', flowsRunning);
    t.is(keys(flowsRunning).length, 1);
    const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
    const fId = Number(flowId.replace('flow', ''));

    // narrow the type
    if (detail.type !== 'deposit') throw t.fail(detail.type);

    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = AmountMath.make(Deposit.brand, detail.amount.value);

    const plan: FundsFlowPlan = {
      flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
    };
    await E(planner1.stub).resolvePlan(
      pId,
      fId,
      plan,
      policyVersion,
      rebalanceCount,
    );
    t.log('planner resolved plan');
  })();

  await Promise.all([traderP, plannerP]);

  const bankTraffic = common.utils.inspectBankBridge();
  const { accountIdByChain } = await trader1.getPortfolioStatus();
  const [_ns, _ref, addr] = accountIdByChain.agoric!.split(':');
  const myVBankIO = bankTraffic.filter(obj =>
    [obj.sender, obj.recipient].includes(addr),
  );
  t.log('bankBridge for', addr, myVBankIO);
  t.like(myVBankIO, [{ type: 'VBANK_GIVE', amount: '1000000000' }]);
});

test('simple rebalance using planner', async t => {
  const { common, trader1, planner1 } = await setupPlanner(t);

  await planner1.redeem();
  await Promise.all([trader1.openPortfolio(t, {}, {}), ackNFA(common.utils)]);
  const pId: number = trader1.getPortfolioId();
  const { usdc } = common.brands;
  const Deposit = usdc.units(3_333.33);
  const depP = trader1.rebalance(
    t,
    { give: { Deposit }, want: {} },
    { flow: [{ src: '<Deposit>', dest: '@agoric', amount: Deposit }] },
  );
  await depP;
  t.log('trader deposited', Deposit);

  const traderP = (async () => {
    const targetAllocation = { USDN: 60000n, Aave_Arbitrum: 4000n };
    await trader1.simpleRebalance(
      t,
      { give: {}, want: {} },
      { targetAllocation },
    );
    t.log('trader rebalanced to', targetAllocation);
  })();

  const plannerP = (async () => {
    const {
      flowsRunning = {},
      policyVersion,
      rebalanceCount,
    } = await trader1.getPortfolioStatus();
    t.log('flowsRunning', flowsRunning);
    t.is(keys(flowsRunning).length, 1);
    const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
    const fId = Number(flowId.replace('flow', ''));

    // narrow the type
    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    const amount = AmountMath.make(usdc.brand, 1_000n);

    const plan: FundsFlowPlan = {
      flow: [{ src: '@agoric', dest: '<Cash>', amount }],
      order: [[0, []]],
    };
    await E(planner1.stub).resolvePlan(
      pId,
      fId,
      plan,
      policyVersion,
      rebalanceCount,
    );
    t.log('planner resolved plan');
  })();

  await Promise.all([traderP, plannerP]);

  const bankTraffic = common.utils.inspectBankBridge();
  const { accountIdByChain } = await trader1.getPortfolioStatus();
  const [_ns, _ref, addr] = accountIdByChain.agoric!.split(':');
  const myVBankIO = bankTraffic.filter(obj =>
    [obj.sender, obj.recipient].includes(addr),
  );
  t.log('bankBridge for', addr, myVBankIO);
  t.like(myVBankIO, [
    { type: 'VBANK_GIVE', amount: '3333330000' },
    { type: 'VBANK_GRAB', amount: '1000' },
  ]);
  t.is(833332500n, (3333330000n * 25n) / 100n);
});

const makeCreateAndDepositScenarioRunner = (
  t: ExecutionContext,
  powers: Awaited<ReturnType<typeof setupPlanner>>,
) => {
  const { common, makeFundedTrader, planner1, readPublished, started } = powers;
  const { usdc } = common.brands;

  type Input = {
    trader1: Awaited<ReturnType<typeof makeFundedTrader>>;
    traderP: Promise<void>;
    plannerP: Promise<void>;
    pId: number;
  };

  let nextPortfolioId = 0;

  return async (
    testOpts: {
      restartOverrides?: Partial<PortfolioPrivateArgs>;
    } = {},
  ) => {
    await planner1.redeem();

    const allSteps: TestStep[] = typedEntries({
      makeTrader1: async (opts, label) => {
        const trader1 = await makeFundedTrader();
        t.log(`${label} trader1 created`);
        return { ...opts, trader1 };
      },
      startOpenPortfolio: async (opts, label) => {
        const Deposit = usdc.units(1_000);
        const traderP = (async () => {
          await opts.trader1?.openPortfolio(
            t,
            { Deposit },
            { targetAllocation: { USDN: 1n } },
          );
          t.log(`${label} trader created with deposit`, Deposit);
        })();

        const pId = nextPortfolioId;
        nextPortfolioId += 1;
        await ackNFA(common.utils, -1);
        return { ...opts, traderP, pId };
      },
      resolvePlan: (opts, label) => {
        const plannerP = (async () => {
          const getStatus = async pId => {
            const x = await readPublished(`portfolios.portfolio${pId}`);
            return x as unknown as StatusFor['portfolio'];
          };

          const pId = opts.pId!;
          const {
            flowsRunning = {},
            policyVersion,
            rebalanceCount,
          } = await getStatus(pId);
          t.is(
            keys(flowsRunning).length,
            1,
            `${label} flowsRunning for ${pId}`,
          );
          const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
          const fId = Number(flowId.replace('flow', ''));

          if (detail.type !== 'deposit') throw t.fail(detail.type);

          const amount = AmountMath.make(usdc.brand, detail.amount.value);
          const plan: FundsFlowPlan = {
            flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
          };
          await E(planner1.stub).resolvePlan(
            pId,
            fId,
            plan,
            policyVersion,
            rebalanceCount,
          );
          t.log(`${label} planner resolved plan`);
        })();

        return { ...opts, plannerP };
      },
      syncTraderAndPlanner: async (opts, label) => {
        await Promise.all([opts.traderP, opts.plannerP]);
        t.log(`${label} trader and planner synced`);
        return opts;
      },
      verifyBankIO: async (opts, label) => {
        const bankTraffic = common.utils.inspectBankBridge();
        const { accountIdByChain } =
          (await opts.trader1?.getPortfolioStatus()) ?? {};
        const [_ns, _ref, addr] = accountIdByChain?.agoric!.split(':') ?? [];
        const myVBankIO = bankTraffic.filter(obj =>
          [obj.sender, obj.recipient].includes(addr),
        );
        t.log(`${label} bankBridge for`, addr, myVBankIO);
        t.like(myVBankIO, [{ type: 'VBANK_GIVE', amount: '1000000000' }]);
        return opts;
      },
    } satisfies Record<string, TestStep<Input>[1]>);

    const interrupt =
      testOpts.restartOverrides &&
      (async () => {
        await t.throwsAsync(
          async () => {
            const privateArgs = common.utils.makePrivateArgs(
              testOpts.restartOverrides,
            );
            await E(started.adminFacet).restartContract(privateArgs);
          },
          { message: 'upgrade not faked' },
        );
      });
    await testInterruptedSteps(t, allSteps, interrupt);
  };
};

test('create portfolio and deposit using planner', async t => {
  const powers = await setupPlanner(t);
  const runScenario = makeCreateAndDepositScenarioRunner(t, powers);
  await runScenario();
  await runScenario({ restartOverrides: {} });
});

test('create portfolio and deposit using planner (upgrade)', async t => {
  const powers = await setupPlanner(t, { defaultFlowConfig: null });
  const runScenario = makeCreateAndDepositScenarioRunner(t, powers);
  await runScenario({ restartOverrides: {} });
});

const erc4626TestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, txResolver } = await setupTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);

    const actualP = trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
          { src: '@Arbitrum', dest: vaultKey, amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration(); // let IBC message go out
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    t.log('ackd send to Axelar to create account');

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );
    const actual = await actualP;

    t.log('=== Portfolio completed');
    const result = actual.result as any;
    t.is(passStyleOf(result.invitationMakers), 'remotable');

    t.is(keys(result.publicSubscribers).length, 1);
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const { contents } = getPortfolioInfoTimed(
      t,
      storagePath,
      common.bootstrap.storage,
    );
    snapshotTimed(t, contents, 'vstorage');
    snapshotTimed(t, actual.payouts, 'refund payouts');
  },
  title(providedTitle = '', vaultKey: AssetPlaceRef) {
    return `${providedTitle} ${vaultKey}`.trim();
  },
});

test(
  'open a portfolio with ERC4626 vault:',
  erc4626TestMacro,
  'ERC4626_vaultU2_Ethereum',
);

test('Withdraw from an ERC4626 position', async t => {
  const { trader1, common, txResolver } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);

  const actualP = trader1.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        {
          src: '@Arbitrum',
          dest: 'ERC4626_vaultU2_Ethereum',
          amount,
          fee: feeCall,
        },
      ],
    },
  );

  await eventLoopIteration(); // let IBC message go out
  await ackNFA(common.utils);
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
  t.log('ackd send to Axelar to create account');

  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );
  const actual = await actualP;

  const result = actual.result as any;

  const withdrawP = trader1.rebalance(
    t,
    { give: {}, want: {} },
    {
      flow: [
        {
          src: 'ERC4626_vaultU2_Ethereum',
          dest: '@Arbitrum',
          amount,
          fee: feeCall,
        },
        {
          src: '@Arbitrum',
          dest: '@agoric',
          amount,
        },
        {
          src: '@agoric',
          dest: '<Cash>',
          amount,
        },
      ],
    },
  );

  // GMP transaction settlement for the withdraw
  await txResolver.drainPending();

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  await simulateCCTPAck(common.utils).finally(() =>
    txResolver
      .drainPending()
      .then(() => simulateAckTransferToAxelar(common.utils)),
  );

  const withdraw = await withdrawP;

  const { storagePath } = result.publicSubscribers.portfolio;
  const { contents } = getPortfolioInfoTimed(
    t,
    storagePath,
    common.bootstrap.storage,
  );
  snapshotTimed(t, contents, 'vstorage');
  snapshotTimed(t, withdraw.payouts, 'refund payouts');
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

test('open portfolio does not require Access token when Access issuer is present', async t => {
  const { common, zoe, started } = await deploy(t);
  const { usdc, bld, poc26 } = common.brands;
  const { when } = common.utils.vowTools;

  const usdcSansMint = usdc;
  const { mint: _bldMint, ...bldSansMint } = bld;
  const { mint: _poc26Mint, ...poc26SansMint } = poc26;

  const wallet = makeWallet(
    { USDC: usdcSansMint, BLD: bldSansMint, Access: poc26SansMint },
    zoe,
    when,
  );

  const doneP = wallet.executePublicOffer({
    id: 'open-no-access',
    invitationSpec: {
      source: 'contract',
      instance: started.instance,
      publicInvitationMaker: 'makeOpenPortfolioInvitation',
    },
    proposal: { give: {} },
    offerArgs: {},
  });
  const done = await Promise.all([doneP, ackNFA(common.utils)]).then(
    ([result]) => result,
  );

  t.is(passStyleOf(done.result.invitationMakers), 'remotable');
  t.like(done.result.publicSubscribers, {
    portfolio: {
      description: 'Portfolio',
      storagePath: `${ROOT_STORAGE_PATH}.portfolios.portfolio0`,
    },
  });
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
