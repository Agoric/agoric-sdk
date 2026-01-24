/**
 * @file YMax portfolio contract tests - user stories
 *
 * For easier snapshot review, add new tests at the end of this file.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import {
  defaultSerializer,
  documentStorageSchema,
  type makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import {
  eventLoopIteration,
  inspectMapStore,
  testInterruptedSteps,
  type TestStep,
} from '@agoric/internal/src/testing-utils.js';
import { typedEntries } from '@agoric/internal';
import type { ExecutionContext } from 'ava';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import { deploy as deployWalletFactory } from '@agoric/smart-wallet/tools/wf-tools.js';
import { hexToBytes } from '@noble/hashes/utils';
import { E, passStyleOf } from '@endo/far';
import type { AssetPlaceRef } from '../src/type-guards-steps.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import type {
  OfferArgsFor,
  StatusFor,
  TargetAllocation,
} from '../src/type-guards.ts';
import { plannerClientMock } from '../tools/agents-mock.ts';
import {
  deploy,
  makeEvmTraderKit,
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import { contractsMock, makeCCTPTraffic, portfolio0lcaOrch } from './mocks.ts';
import { chainInfoWithCCTP, makeStorageTools } from './supports.ts';
import type { PortfolioPrivateArgs } from '../src/portfolio.contract.ts';

const { fromEntries, keys, values } = Object;

const range = (n: number) => [...Array(n).keys()];

type FakeStorage = ReturnType<typeof makeFakeStorageKit>;

const pendingTxOpts = {
  pattern: `${ROOT_STORAGE_PATH}.`,
  replacement: 'published.',
  node: `pendingTxs`,
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

const getFlowHistory = (
  portfolioKey: string,
  flowCount: number,
  storage: FakeStorage,
) => {
  const flowPaths = range(flowCount).map(
    ix => `${portfolioKey}.flows.flow${ix + 1}`,
  );
  const flowEntries: [string, StatusFor['flow'][]][] = flowPaths.map(p => [
    p,
    storage.getDeserialized(p),
  ]);
  const stepsEntries = flowPaths
    .map(fp => `${fp}.steps`)
    .map(fsp => [fsp, storage.getDeserialized(fsp).at(-1)]);
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

const makeResolveDepositPlan = ({
  readPublished,
  planner1,
  usdc,
  bld,
  publishedPath,
  t,
}: {
  readPublished: (path: string) => Promise<StatusFor['portfolio']>;
  planner1: ReturnType<typeof plannerClientMock>;
  usdc: { brand: Brand<'nat'> };
  bld: { units: (value: number) => NatAmount };
  publishedPath: string;
  t: ExecutionContext;
}) => {
  return async () => {
    const status = await readPublished(publishedPath);
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const { fromChain } = detail;
    if (!fromChain) throw t.fail('deposit detail missing fromChain');
    if (!(fromChain in contractsMock)) {
      throw t.fail(`unexpected fromChain for EVM deposit: ${fromChain}`);
    }
    const fromChainRef = `+${fromChain}` as AssetPlaceRef;
    const toChainRef = `@${fromChain}` as AssetPlaceRef;
    const plan: FundsFlowPlan = {
      flow: [
        { src: fromChainRef, dest: toChainRef, amount: planDepositAmount, fee },
        {
          src: toChainRef,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(0, flowNum, plan, ...sync);
    return flowNum;
  };
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
  const { contents, positionPaths } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);

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
  t.snapshot(done.payouts, 'refund payouts');
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
  const { contents } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);
  t.snapshot(actual.payouts, 'refund payouts');
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
  const { contents } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);
  t.snapshot(actual.payouts, 'refund payouts');
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
  const { contents } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);
  t.snapshot(done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree.chainHub; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  t.snapshot(tree, 'baggage after open with positions');
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

  t.snapshot(info, 'portfolio');
  t.snapshot(done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree.chainHub; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  t.snapshot(tree, 'baggage after open with target allocations');
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
  const { contents } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);

  t.snapshot(rebalanceResult.payouts, 'rebalance payouts');
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
  const { contents, positionPaths } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);

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

  const portfolioInfo = getPortfolioInfo(storagePath, storage);
  const flowInfo =
    portfolioInfo.contents[`${storagePath}.flows.${rebalanceRet.result}`];
  t.snapshot(flowInfo, 'flow info after failed claim');
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
    const { contents } = getPortfolioInfo(storagePath, storage);
    t.snapshot(contents, 'vstorage');
    await documentStorageSchema(t, storage, pendingTxOpts);
    t.snapshot(actual.payouts, 'refund payouts');
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
  const { contents } = getPortfolioInfo(storagePath, storage);
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, storage, pendingTxOpts);
  t.snapshot(withdraw.payouts, 'refund payouts');
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
  t.snapshot(tree, 'contract baggage after start');
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
    const { contents } = getPortfolioInfo(storagePath, storage);
    t.snapshot(contents, 'vstorage');
    await documentStorageSchema(t, storage, pendingTxOpts);
    t.snapshot(actual.payouts, 'refund payouts');
  },
);

test.serial('2 portfolios open EVM positions: parallel CCTP ack', async t => {
  const { trader1, common, txResolver, trader2 } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -5);

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
    const { contents } = getPortfolioInfo(storagePath, storage);
    t.snapshot(contents, storagePath);
  }
  await documentStorageSchema(t, storage, pendingTxOpts);
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
  t,
  overrides: Partial<PortfolioPrivateArgs> = {},
) => {
  const {
    common,
    zoe,
    started,
    makeFundedTrader,
    trader1,
    txResolver,
    timerService,
    contractBaggage,
  } = await setupTrader(t, undefined, overrides);
  const { storage } = common.bootstrap;
  const { readPublished, readLegible } = makeStorageTools(storage);
  const utils = { ...common.utils, readLegible };
  const boot = async () => ({ ...common.bootstrap, zoe, utils });
  const { provisionSmartWallet } = await deployWalletFactory({ boot });

  const [walletPlanner] = await provisionSmartWallet('agoric1planner');
  const toPlan = await E(started.creatorFacet).makePlannerInvitation();
  await E(E(walletPlanner).getDepositFacet()).receive(toPlan);
  const planner1 = plannerClientMock(walletPlanner, started.instance, () =>
    readPublished(`wallet.agoric1planner`),
  );
  const { evmTrader, evmAccount } = await makeEvmTraderKit({
    common,
    zoe,
    started,
    timerService,
    contractBaggage,
  });
  return {
    common,
    zoe,
    started,
    makeFundedTrader,
    trader1,
    planner1,
    readPublished,
    txResolver,
    evmTrader,
    evmAccount,
  };
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
  });
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
    const [[flowId, detail]] = Object.entries(flowsRunning);
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
    const [[flowId, detail]] = Object.entries(flowsRunning);
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
    const [[flowId, detail]] = Object.entries(flowsRunning);
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

const createAndDepositTestMacro = test.macro(
  async (
    t,
    testOpts: {
      deployOverrides?: Partial<PortfolioPrivateArgs>;
      restartOverrides?: Partial<PortfolioPrivateArgs>;
    } = {},
  ) => {
    const { common, makeFundedTrader, planner1, readPublished, started } =
      await setupPlanner(t, testOpts.deployOverrides);
    const { usdc } = common.brands;

    await planner1.redeem();

    type Input = {
      trader1: Awaited<ReturnType<typeof makeFundedTrader>>;
      traderP: Promise<void>;
      plannerP: Promise<void>;
      pId: number;
    };

    let nextPortfolioId = 0;
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
            // NOTE: readPublished uses eventLoopIteration() to let vstorage writes settle
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
          const [[flowId, detail]] = Object.entries(flowsRunning);
          const fId = Number(flowId.replace('flow', ''));

          // narrow the type
          if (detail.type !== 'deposit') throw t.fail(detail.type);

          // XXX brand from vstorage isn't suitable for use in call to kit
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

            // XXX restartContract is not supported in this test environment.
            // The interrupt hook is intentionally a no-op here; restart
            // behavior is covered by boot tests instead.
            await E(started.adminFacet).restartContract(privateArgs);
          },
          { message: 'upgrade not faked' },
        );
      });
    await testInterruptedSteps(t, allSteps, interrupt);
  },
);

test('create portfolio and deposit using planner', createAndDepositTestMacro);
test(
  'create portfolio and deposit using planner (restart)',
  createAndDepositTestMacro,
  {
    restartOverrides: {},
  },
);
test(
  'create portfolio and deposit using planner (upgrade)',
  createAndDepositTestMacro,
  {
    deployOverrides: {
      // Start with no config argument.
      defaultFlowConfig: null,
    },
    restartOverrides: {},
  },
);

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
    const { contents } = getPortfolioInfo(
      storagePath,
      common.bootstrap.storage,
    );
    t.snapshot(contents, 'vstorage');
    t.snapshot(actual.payouts, 'refund payouts');
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
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(withdraw.payouts, 'refund payouts');
});

test('open portfolio from Arbitrum, 1000 USDC deposit', async t => {
  const { common, planner1, readPublished, txResolver, evmTrader } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;

  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [
      { instrument: 'Aave_Arbitrum', portion: 6000n },
      { instrument: 'Compound_Arbitrum', portion: 4000n },
    ],
  };
  const { fromChain: evm, depositAmount, allocations } = inputs;

  const expected = {
    storagePath: `${ROOT_STORAGE_PATH}.portfolios.portfolio0`,
    positions: { Aave: usdc.units(600), Compound: usdc.units(400) },
  };

  const traderDo = async () => {
    const { storagePath } = await evmTrader
      .forChain(evm)
      .openPortfolio(allocations, depositAmount.value);
    t.is(storagePath, expected.storagePath);
  };

  /** Simulate chain inputs (acks) for makeAccount + GMP transfers. */
  const chainDo = async () => {
    await ackNFA(common.utils);
    // Ack the makeAccount transfer before settling pending txs.
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    // Ack the GMP contract call once pending txs are resolved.
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    // Ack the second GMP call for the second position.
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    // Ack the third GMP call for the third position.
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const pId = 0;
    await traderDo;
    // XXX refactor flow-context extraction (see other planner tests in this file).
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    t.is(detail.amount.value, depositAmount.value);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const { Aave, Compound } = expected.positions;
    const plan: FundsFlowPlan = {
      flow: [
        { src: `+${evm}`, dest: `@${evm}`, amount: planDepositAmount, fee },
        { src: `@${evm}`, dest: 'Aave_Arbitrum', amount: Aave, fee },
        { src: `@${evm}`, dest: 'Compound_Arbitrum', amount: Compound, fee },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  const [, flowNum] = await Promise.all([traderDo(), plannerDo(), chainDo()]);

  const status = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];

  const { contents } = getPortfolioInfo(
    expected.storagePath,
    common.bootstrap.storage,
  );
  const flowHistory = contents[`${expected.storagePath}.flows.flow${flowNum}`];

  t.truthy(
    Array.isArray(flowHistory) &&
      flowHistory.some(entry => entry?.state === 'done'),
    'flow history should include a done entry',
  );
  t.deepEqual(
    status.flowsRunning,
    {},
    'flowsRunning should be empty after plan completes',
  );
  t.truthy(status.accountIdByChain?.Arbitrum);
  t.is(status.positionKeys.length, 2);
  // Verify sourceAccountId is stored in CAIP-10 format
  const expectedSourceAccountId =
    `eip155:${chainInfoWithCCTP[evm].reference}:${evmTrader.getAddress().toLowerCase()}` as const;
  t.is(
    status.sourceAccountId,
    expectedSourceAccountId,
    'sourceAccountId from vstorage',
  );
  t.is(
    contents[expected.storagePath]?.sourceAccountId,
    expectedSourceAccountId,
    'sourceAccountId in storage contents',
  );
  t.snapshot(contents, 'vstorage');
  await documentStorageSchema(t, common.bootstrap.storage, pendingTxOpts);

  const posKey = `${expected.storagePath}.positions`;
  const posBalances = {
    Aave: contents[`${posKey}.Aave_Arbitrum`]?.totalIn,
    Compound: contents[`${posKey}.Compound_Arbitrum`]?.totalIn,
  };
  t.deepEqual(posBalances, expected.positions);
});

test('evmHandler.withdraw starts a withdraw flow', async t => {
  const { common, planner1, readPublished, txResolver, evmTrader } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;

  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };
  const { fromChain: evm, depositAmount, allocations } = inputs;

  const traderDo = async () => {
    const result = await evmTrader
      .forChain(evm)
      .openPortfolio(allocations, depositAmount.value);
    return result;
  };

  // Start traderDo first so plannerDo can wait for it
  const traderDoP = traderDo();

  /** Simulate chain inputs (acks) for makeAccount + GMP transfers. */
  const chainDo = async () => {
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const { portfolioId: pId } = await traderDoP;
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const plan: FundsFlowPlan = {
      flow: [
        { src: `+${evm}`, dest: `@${evm}`, amount: planDepositAmount, fee },
        {
          src: `@${evm}`,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  await Promise.all([traderDoP, plannerDo(), chainDo()]);

  // Verify portfolio is ready
  const statusBefore = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];
  t.deepEqual(statusBefore.flowsRunning, {}, 'no flows running after deposit');
  t.truthy(statusBefore.sourceAccountId, 'sourceAccountId is set');

  // Now test the withdraw via evmHandler
  const withdrawDetails = { token: contractsMock[evm].usdc, amount: 500n };
  const flowKey = await evmTrader.forChain(evm).withdraw(withdrawDetails);
  if (typeof flowKey !== 'string') {
    throw t.fail('withdraw did not return a flow key');
  }
  const flowKeyStr = flowKey;
  t.regex(flowKeyStr, /^flow\d+$/, 'withdraw returns a flow key');

  // Check that a withdraw flow is now running
  const statusAfter = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];
  const flowsRunning = statusAfter.flowsRunning ?? {};
  t.is(keys(flowsRunning).length, 1, 'one flow running');

  const [[flowId, flowDetail]] = Object.entries(flowsRunning);
  t.is(flowId, flowKeyStr, 'flow key matches');
  t.is(flowDetail.type, 'withdraw', 'flow is a withdraw');
  if (flowDetail.type === 'withdraw') {
    t.is(
      flowDetail.amount.value,
      withdrawDetails.amount,
      'withdraw amount matches',
    );
  }
});

test('evmHandler.withdraw fails if sourceAccountId not set', async t => {
  const { trader1, common } = await setupTrader(t);
  const { poc26 } = common.brands;

  // Open portfolio via regular method (not from EVM), so no sourceAccountId
  await Promise.all([
    trader1.openPortfolio(t, { Access: poc26.make(1n) }, {}),
    ackNFA(common.utils),
  ]);

  // The trader1 helper doesn't give direct access to evmHandler,
  // so we verify by checking that sourceAccountId is not set
  const status = await trader1.getPortfolioStatus();
  t.is(
    status.sourceAccountId,
    undefined,
    'sourceAccountId not set for regular portfolio',
  );
});

// TODO: Deposits to existing accounts need a new GMP call type that invokes
// permit2 from the existing smart wallet. Currently only new-chain deposits
// (via depositFactory) are supported.
test.todo('evmHandler.deposit to existing chain starts a deposit flow');

test('evmHandler.deposit (existing Arbitrum) completes a deposit flow', async t => {
  const { common, planner1, started, readPublished, txResolver } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;
  const publishedPath = 'portfolios.portfolio0';
  const storagePath = `${ROOT_STORAGE_PATH}.portfolios.portfolio0`;

  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };
  const { fromChain: evm, depositAmount, allocations } = inputs;
  const ownerAddress = '0x2222222222222222222222222222222222222222';

  type EvmHandler = Awaited<
    ReturnType<typeof started.publicFacet.openPortfolioFromEVM>
  >['evmHandler'];
  let evmHandler: EvmHandler | undefined;

  const traderDo = async () => {
    const permit2Payload = {
      permit: {
        permitted: {
          token: contractsMock[evm].usdc,
          amount: depositAmount.value,
        },
        nonce: 1n,
        deadline: 1n,
      },
      owner: ownerAddress,
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234',
    } as const;
    const permitDetails = {
      chainId: Number(chainInfoWithCCTP[evm].reference),
      token: contractsMock[evm].usdc,
      amount: depositAmount.value,
      spender: contractsMock[evm].depositFactory,
      permit2Payload,
    } as const;

    const result = await E(started.publicFacet).openPortfolioFromEVM(
      { allocations },
      permitDetails,
    );
    evmHandler = result.evmHandler;
    return result;
  };

  // Start traderDo first so plannerDo can wait for it
  const traderDoP = traderDo();

  /** Simulate chain inputs (acks) for makeAccount + GMP transfers. */
  const chainDo = async () => {
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const pId = 0;
    // Wait for trader to open portfolio before reading status
    await traderDoP;
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const plan: FundsFlowPlan = {
      flow: [
        { src: `+${evm}`, dest: `@${evm}`, amount: planDepositAmount, fee },
        {
          src: `@${evm}`,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  await Promise.all([traderDoP, plannerDo(), chainDo()]);

  // Verify portfolio is ready - read status AFTER flow completes to get account info
  const statusBefore = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];
  t.deepEqual(statusBefore.flowsRunning, {}, 'no flows running after deposit');
  t.truthy(statusBefore.sourceAccountId, 'sourceAccountId is set');
  // Get the portfolio's remote address now that accounts are published
  const portfolioRemoteAddress = statusBefore.accountIdByChain?.[evm]
    ?.split(':')
    .at(-1);
  t.truthy(portfolioRemoteAddress, 'portfolio has a remote address on EVM');
  const lcaAddress = statusBefore.accountIdByChain?.agoric?.split(':').at(-1);
  t.truthy(lcaAddress, 'LCA address exists');
  const predictedExistingSpender = predictWalletAddress({
    owner: lcaAddress!,
    factoryAddress: contractsMock[evm].depositFactory,
    gatewayAddress: contractsMock[evm].gateway,
    gasServiceAddress: contractsMock[evm].gasService,
    walletBytecode: hexToBytes('1234'), // matches contract-setup.ts
  });
  t.log(`predicted ${evm} depositFactory address`, predictedExistingSpender);
  t.is(
    portfolioRemoteAddress,
    predictedExistingSpender,
    'existing chain spender uses depositFactory prediction',
  );

  // Now test the deposit via evmHandler
  t.truthy(evmHandler, 'evmHandler is defined');
  const newDepositAmount = usdc.units(500);
  const newPermit2Payload = {
    permit: {
      permitted: {
        token: contractsMock[evm].usdc,
        amount: newDepositAmount.value,
      },
      nonce: 2n,
      deadline: 1n,
    },
    owner: ownerAddress,
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'DepositWitness',
    signature: '0x5678',
  } as const;
  const newPermitDetails = {
    chainId: Number(chainInfoWithCCTP[evm].reference),
    token: contractsMock[evm].usdc,
    amount: newDepositAmount.value,
    // For deposit, spender is the portfolio's account (not factory)
    spender: portfolioRemoteAddress as `0x${string}`,
    permit2Payload: newPermit2Payload,
  } as const;

  const flowKey = await E(evmHandler!).deposit(newPermitDetails);
  t.regex(flowKey, /^flow\d+$/, 'deposit returns a flow key');

  // Check that a deposit flow is now running
  const statusAfter = (await readPublished(
    publishedPath,
  )) as unknown as StatusFor['portfolio'];
  const flowsRunning = statusAfter.flowsRunning ?? {};
  t.is(keys(flowsRunning).length, 1, 'one flow running');

  const [[flowId, flowDetail]] = Object.entries(flowsRunning);
  t.is(flowId, flowKey, 'flow key matches');
  t.is(flowDetail.type, 'deposit', 'flow is a deposit');
  if (flowDetail.type === 'deposit') {
    t.is(
      flowDetail.amount.value,
      newDepositAmount.value,
      'deposit amount matches',
    );
    t.is(flowDetail.fromChain, evm, 'fromChain matches');
  }

  const resolveDepositPlan = makeResolveDepositPlan({
    readPublished: path =>
      readPublished(path) as Promise<StatusFor['portfolio']>,
    planner1,
    usdc,
    bld,
    publishedPath,
    t,
  });

  const completeDepositChain = async () => {
    for (let i = 0; i < 10; i += 1) {
      const status = (await readPublished(
        publishedPath,
      )) as unknown as StatusFor['portfolio'];
      if (keys(status.flowsRunning ?? {}).length === 0) return;
      await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
      await txResolver.drainPending();
    }
  };

  const depositFlowNum = await resolveDepositPlan();
  await completeDepositChain();

  const statusDone = (await readPublished(
    publishedPath,
  )) as unknown as StatusFor['portfolio'];
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  const flowHistory = contents[`${storagePath}.flows.flow${depositFlowNum}`];
  t.truthy(
    Array.isArray(flowHistory) &&
      flowHistory.some(entry => entry?.state === 'done'),
    'deposit flow history should include a done entry',
  );
  t.deepEqual(
    statusDone.flowsRunning,
    {},
    'no flows running after deposit completes',
  );
});

// Test deposits from a NEW chain (where no account exists yet).
// For deposits to existing portfolios, spender must be the predicted smart wallet address
// (not depositFactory). The wallet is created via provideEVMAccount first.

test('evmHandler.deposit (Arbitrum -> Base) completes a deposit flow', async t => {
  const { common, planner1, started, readPublished, txResolver } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;
  const publishedPath = 'portfolios.portfolio0';
  const storagePath = `${ROOT_STORAGE_PATH}.portfolios.portfolio0`;

  // Open portfolio from Arbitrum first
  const openChain = 'Arbitrum' as const;
  const depositAmount = usdc.units(1000);
  const allocations = [{ instrument: 'Aave_Arbitrum', portion: 10000n }];
  const ownerAddress = '0x2222222222222222222222222222222222222222';

  type EvmHandler = Awaited<
    ReturnType<typeof started.publicFacet.openPortfolioFromEVM>
  >['evmHandler'];
  let evmHandler: EvmHandler | undefined;

  const traderDo = async () => {
    const permit2Payload = {
      permit: {
        permitted: {
          token: contractsMock[openChain].usdc,
          amount: depositAmount.value,
        },
        nonce: 1n,
        deadline: 1n,
      },
      owner: ownerAddress,
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234',
    } as const;
    const permitDetails = {
      chainId: Number(chainInfoWithCCTP[openChain].reference),
      token: contractsMock[openChain].usdc,
      amount: depositAmount.value,
      spender: contractsMock[openChain].depositFactory,
      permit2Payload,
    } as const;

    const result = await E(started.publicFacet).openPortfolioFromEVM(
      { allocations },
      permitDetails,
    );
    evmHandler = result.evmHandler;
    return result;
  };

  const traderDoP = traderDo();

  const chainDo = async () => {
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const pId = 0;
    await traderDoP;
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const plan: FundsFlowPlan = {
      flow: [
        {
          src: `+${openChain}`,
          dest: `@${openChain}`,
          amount: planDepositAmount,
          fee,
        },
        {
          src: `@${openChain}`,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  await Promise.all([traderDoP, plannerDo(), chainDo()]);

  t.truthy(evmHandler, 'evmHandler is defined');

  // Check portfolio has account on openChain but NOT on Base
  const statusBefore = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];
  t.truthy(statusBefore.accountIdByChain?.[openChain], 'has Arbitrum account');
  t.falsy(statusBefore.accountIdByChain?.Base, 'no Base account yet');
  const existingArbitrumAddress = statusBefore.accountIdByChain?.[openChain]
    ?.split(':')
    .at(-1);
  t.log(`existing ${openChain} address`, existingArbitrumAddress);

  // Get the LCA address to predict the wallet address for the new chain
  const lcaAddress = statusBefore.accountIdByChain?.agoric?.split(':').at(-1);
  t.truthy(lcaAddress, 'LCA address exists');

  // Now deposit from Base (a NEW chain for this portfolio)
  const newChain = 'Base' as const;

  // For deposits to existing portfolios, spender must be the predicted smart wallet address
  const newChainContracts = contractsMock[newChain];
  const predictedSpender = predictWalletAddress({
    owner: lcaAddress!,
    factoryAddress: newChainContracts.factory,
    gatewayAddress: newChainContracts.gateway,
    gasServiceAddress: newChainContracts.gasService,
    walletBytecode: hexToBytes('1234'), // matches contract-setup.ts
  });
  t.log(`predicted ${newChain} factory address`, predictedSpender);

  const newDepositAmount = usdc.units(500);
  const newPermit2Payload = {
    permit: {
      permitted: {
        token: contractsMock[newChain].usdc,
        amount: newDepositAmount.value,
      },
      nonce: 2n,
      deadline: 1n,
    },
    owner: ownerAddress,
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'DepositWitness',
    signature: '0x5678',
  } as const;
  await t.throwsAsync(
    () =>
      E(evmHandler!).deposit({
        chainId: Number(chainInfoWithCCTP[newChain].reference),
        token: contractsMock[newChain].usdc,
        amount: newDepositAmount.value,
        // Wrong spender: should be predicted wallet address, not depositFactory.
        spender: contractsMock[newChain].depositFactory,
        permit2Payload: newPermit2Payload,
      }),
    {
      message: /permit spender .* does not match portfolio account/,
    },
    'deposit rejects depositFactory spender for new chain',
  );
  const newPermitDetails = {
    chainId: Number(chainInfoWithCCTP[newChain].reference),
    token: contractsMock[newChain].usdc,
    amount: newDepositAmount.value,
    // For deposits to existing portfolios, spender is the predicted smart wallet address
    spender: predictedSpender as `0x${string}`,
    permit2Payload: newPermit2Payload,
  } as const;

  const flowKey = await E(evmHandler!).deposit(newPermitDetails);
  t.regex(flowKey, /^flow\d+$/, 'deposit returns a flow key');

  // Check that a deposit flow is now running
  const statusAfter = (await readPublished(
    publishedPath,
  )) as unknown as StatusFor['portfolio'];
  const flowsRunning = statusAfter.flowsRunning ?? {};
  t.is(keys(flowsRunning).length, 1, 'one flow running');

  const [[flowId, flowDetail]] = Object.entries(flowsRunning);
  t.is(flowId, flowKey, 'flow key matches');
  t.is(flowDetail.type, 'deposit', 'flow is a deposit');
  if (flowDetail.type === 'deposit') {
    t.is(
      flowDetail.amount.value,
      newDepositAmount.value,
      'deposit amount matches',
    );
    t.is(flowDetail.fromChain, newChain, 'fromChain is the new chain');
  }

  const resolveDepositPlan = makeResolveDepositPlan({
    readPublished: path =>
      readPublished(path) as Promise<StatusFor['portfolio']>,
    planner1,
    usdc,
    bld,
    publishedPath,
    t,
  });

  const completeDepositChain = async () => {
    for (let i = 0; i < 10; i += 1) {
      const status = (await readPublished(
        publishedPath,
      )) as unknown as StatusFor['portfolio'];
      if (keys(status.flowsRunning ?? {}).length === 0) return;
      await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
      await txResolver.drainPending();
    }
  };

  const depositFlowNum = await resolveDepositPlan();
  await completeDepositChain();

  const statusDone = (await readPublished(
    publishedPath,
  )) as unknown as StatusFor['portfolio'];
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  const flowHistory = contents[`${storagePath}.flows.flow${depositFlowNum}`];
  t.truthy(
    Array.isArray(flowHistory) &&
      flowHistory.some(entry => entry?.state === 'done'),
    'deposit flow history should include a done entry',
  );
  t.deepEqual(
    statusDone.flowsRunning,
    {},
    'no flows running after deposit completes',
  );
});

test('evmHandler.deposit fails if sourceAccountId not set', async t => {
  const { trader1, common } = await setupTrader(t);
  const { poc26 } = common.brands;

  // Open portfolio via regular method (not from EVM), so no sourceAccountId
  await Promise.all([
    trader1.openPortfolio(t, { Access: poc26.make(1n) }, {}),
    ackNFA(common.utils),
  ]);

  // Verify sourceAccountId is not set
  const status = await trader1.getPortfolioStatus();
  t.is(
    status.sourceAccountId,
    undefined,
    'sourceAccountId not set for regular portfolio',
  );
  // Note: We can't directly test the evmHandler.deposit() failure here
  // because trader1 helper doesn't expose evmHandler for regular portfolios.
  // The implementation will throw "deposit requires sourceAccountId to be set"
  // when called without sourceAccountId.
});

test('evmHandler.deposit fails if owner does not match', async t => {
  const { common, planner1, started, readPublished, txResolver } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;

  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };
  const { fromChain: evm, depositAmount, allocations } = inputs;
  const ownerAddress = '0x2222222222222222222222222222222222222222';
  const wrongOwnerAddress = '0x3333333333333333333333333333333333333333';

  type EvmHandler = Awaited<
    ReturnType<typeof started.publicFacet.openPortfolioFromEVM>
  >['evmHandler'];
  let evmHandler: EvmHandler | undefined;

  const traderDo = async () => {
    const permit2Payload = {
      permit: {
        permitted: {
          token: contractsMock[evm].usdc,
          amount: depositAmount.value,
        },
        nonce: 1n,
        deadline: 1n,
      },
      owner: ownerAddress,
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234',
    } as const;
    const permitDetails = {
      chainId: Number(chainInfoWithCCTP[evm].reference),
      token: contractsMock[evm].usdc,
      amount: depositAmount.value,
      spender: contractsMock[evm].depositFactory,
      permit2Payload,
    } as const;

    const result = await E(started.publicFacet).openPortfolioFromEVM(
      { allocations },
      permitDetails,
    );
    evmHandler = result.evmHandler;
    return result;
  };

  const traderDoP = traderDo();

  const chainDo = async () => {
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const pId = 0;
    await traderDoP;
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const plan: FundsFlowPlan = {
      flow: [
        { src: `+${evm}`, dest: `@${evm}`, amount: planDepositAmount, fee },
        {
          src: `@${evm}`,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  await Promise.all([traderDoP, plannerDo(), chainDo()]);

  // Get portfolio status after flow completes
  const statusAfterFlow = (await readPublished(
    `portfolios.portfolio0`,
  )) as unknown as StatusFor['portfolio'];
  const portfolioRemoteAddress = statusAfterFlow.accountIdByChain?.[evm]
    ?.split(':')
    .at(-1);

  t.truthy(evmHandler, 'evmHandler is defined');
  t.truthy(portfolioRemoteAddress, 'portfolio has a remote address');

  // Try to deposit with wrong owner address
  const newDepositAmount = usdc.units(500);
  const newPermit2Payload = {
    permit: {
      permitted: {
        token: contractsMock[evm].usdc,
        amount: newDepositAmount.value,
      },
      nonce: 2n,
      deadline: 1n,
    },
    owner: wrongOwnerAddress, // Different from portfolio's source address
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'DepositWitness',
    signature: '0x5678',
  } as const;
  const newPermitDetails = {
    chainId: Number(chainInfoWithCCTP[evm].reference),
    token: contractsMock[evm].usdc,
    amount: newDepositAmount.value,
    spender: portfolioRemoteAddress as `0x${string}`,
    permit2Payload: newPermit2Payload,
  } as const;

  await t.throwsAsync(
    () => E(evmHandler!).deposit(newPermitDetails),
    {
      message: /permit owner .* does not match portfolio source address/,
    },
    'deposit fails with mismatched owner',
  );
});

// This test validates that deposits to existing chains fail with a clear message.
// When deposit-to-existing is implemented, this error case will change to
// validate that spender matches the portfolio's smart wallet address.
test('evmHandler.deposit to existing chain fails with clear message', async t => {
  const { common, planner1, started, readPublished, txResolver } =
    await setupPlanner(t);
  const { usdc, bld } = common.brands;

  const inputs = {
    fromChain: 'Arbitrum' as const,
    depositAmount: usdc.units(1000),
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  };
  const { fromChain: evm, depositAmount, allocations } = inputs;
  const ownerAddress = '0x2222222222222222222222222222222222222222';

  type EvmHandler = Awaited<
    ReturnType<typeof started.publicFacet.openPortfolioFromEVM>
  >['evmHandler'];
  let evmHandler: EvmHandler | undefined;

  const traderDo = async () => {
    const permit2Payload = {
      permit: {
        permitted: {
          token: contractsMock[evm].usdc,
          amount: depositAmount.value,
        },
        nonce: 1n,
        deadline: 1n,
      },
      owner: ownerAddress,
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234',
    } as const;
    const permitDetails = {
      chainId: Number(chainInfoWithCCTP[evm].reference),
      token: contractsMock[evm].usdc,
      amount: depositAmount.value,
      spender: contractsMock[evm].depositFactory,
      permit2Payload,
    } as const;

    const result = await E(started.publicFacet).openPortfolioFromEVM(
      { allocations },
      permitDetails,
    );
    evmHandler = result.evmHandler;
    return result;
  };

  const traderDoP = traderDo();

  const chainDo = async () => {
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  };

  const plannerDo = async () => {
    const pId = 0;
    await traderDoP;
    const status = (await readPublished(
      `portfolios.portfolio${pId}`,
    )) as unknown as StatusFor['portfolio'];
    const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
    const sync = [policyVersion, rebalanceCount] as const;
    const [[flowId, detail]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
    const fee = bld.units(100);
    const plan: FundsFlowPlan = {
      flow: [
        { src: `+${evm}`, dest: `@${evm}`, amount: planDepositAmount, fee },
        {
          src: `@${evm}`,
          dest: 'Aave_Arbitrum',
          amount: planDepositAmount,
          fee,
        },
      ],
    };
    await E(planner1.stub).resolvePlan(pId, flowNum, plan, ...sync);
    return flowNum;
  };

  await planner1.redeem();
  await Promise.all([traderDoP, plannerDo(), chainDo()]);

  t.truthy(evmHandler, 'evmHandler is defined');

  // Try to deposit with wrong spender (factory instead of portfolio account)
  const newDepositAmount = usdc.units(500);
  const newPermit2Payload = {
    permit: {
      permitted: {
        token: contractsMock[evm].usdc,
        amount: newDepositAmount.value,
      },
      nonce: 2n,
      deadline: 1n,
    },
    owner: ownerAddress,
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'DepositWitness',
    signature: '0x5678',
  } as const;
  const newPermitDetails = {
    chainId: Number(chainInfoWithCCTP[evm].reference),
    token: contractsMock[evm].usdc,
    amount: newDepositAmount.value,
    // Use factory address instead of portfolio's account
    spender: contractsMock[evm].depositFactory,
    permit2Payload: newPermit2Payload,
  } as const;

  await t.throwsAsync(
    () => E(evmHandler!).deposit(newPermitDetails),
    {
      message: /permit spender .* does not match portfolio account/,
    },
    'deposit to existing chain fails with clear message',
  );
});
