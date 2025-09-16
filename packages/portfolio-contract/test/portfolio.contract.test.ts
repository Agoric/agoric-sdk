/** @file YMax portfolio contract tests - user stories */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { VStorage } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import type { StreamCell } from '@agoric/internal/src/lib-chainStorage.js';
import type { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  eventLoopIteration,
  inspectMapStore,
} from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.ts';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { deploy as deployWalletFactory } from '@agoric/smart-wallet/tools/wf-tools.js';
import { E, passStyleOf } from '@endo/far';
import type { OfferArgsFor, StatusFor } from '../src/type-guards.ts';
import { plannerClientMock } from '../tools/agents-mock.ts';
import {
  deploy,
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import {
  evmNamingDistinction,
  portfolio0lcaOrch,
  makeCCTPTraffic,
} from './mocks.ts';
import { getResolverMakers, settleTransaction } from './resolver-helpers.ts';
import type { AssetPlaceRef } from '../src/type-guards-steps.ts';

const { fromEntries, keys, values } = Object;

// Use an EVM chain whose axelar ID differs from its chain name
const { sourceChain } = evmNamingDistinction;

const range = (n: number) => [...Array(n).keys()];

type FakeStorage = ReturnType<typeof makeFakeStorageKit>;

const getFlowHistory = (
  portfolioKey: string,
  flowCount: number,
  storage: FakeStorage,
) => {
  const flowPaths = range(flowCount).map(
    ix => `${portfolioKey}.flows.flow${ix + 1}`,
  );
  const flowEntries = flowPaths.map(p => [p, storage.getDeserialized(p)]);
  return {
    flowPaths,
    byFlow: fromEntries(flowEntries) as Record<string, StatusFor['flow']>,
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

test('open portfolio with USDN position', async t => {
  const { trader1, common } = await setupTrader(t);
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
  const { contents, positionPaths, flowPaths } = getPortfolioInfo(
    storagePath,
    common.bootstrap.storage,
  );
  t.snapshot(contents, 'vstorage');
  t.log(
    'I can see where my money is:',
    positionPaths.map(p => contents[p].accountId),
  );
  t.is(contents[positionPaths[0]].accountId, `cosmos:noble-1:cosmos1test`);
  t.is(
    contents[storagePath].accountIdByChain['agoric'],
    `cosmos:agoric-3:${portfolio0lcaOrch}`,
    'LCA',
  );
  t.snapshot(done.payouts, 'refund payouts');
});

test.serial('open a portfolio with Aave position', async t => {
  const { trader1, common, started, zoe } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);
  const detail = { evmGas: 175n };

  const actualP = trader1.openPortfolio(
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

  await eventLoopIteration();
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  t.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
  const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
  const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  const [actual, cctpResult] = await Promise.all([
    actualP,
    cctpSettlementPromise,
    gmpSettlementPromise,
  ]);

  t.log('=== Portfolio completed, CCTP result:', cctpResult);
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(actual.payouts, 'refund payouts');
});

test('open a portfolio with Compound position', async t => {
  const { trader1, common, started, zoe } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  t.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
  const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
  const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  t.log('=== Waiting for portfolio completion and CCTP confirmation ===');
  const [actual, cctpResult] = await Promise.all([
    actualP,
    cctpSettlementPromise,
    gmpSettlementPromise,
  ]);

  t.log('=== Portfolio completed, CCTP result:', cctpResult);
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(actual.payouts, 'refund payouts');
});

test('open portfolio with USDN, Aave positions', async t => {
  const { trader1, common, contractBaggage, started, zoe } =
    await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  t.log('ackd send to noble');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  // Start CCTP confirmation for the Aave portion (amount goes to Arbitrum)
  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
  const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
  const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  await eventLoopIteration(); // let bridge I/O happen

  const [done, cctpResult] = await Promise.all([
    doneP,
    cctpSettlementPromise,
    gmpSettlementPromise,
  ]);

  t.log('=== Portfolio completed, CCTP result:', cctpResult);
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree['chainHub']; // 'initial baggage' test captures this
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

  const done = await doneP;
  const result = done.result as any;
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const info = await trader1.getPortfolioStatus();
  t.deepEqual(info.targetAllocation, targetAllocation);

  t.snapshot(info, 'portfolio');
  t.snapshot(done.payouts, 'refund payouts');

  const tree = inspectMapStore(contractBaggage);
  delete tree['chainHub']; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  t.snapshot(tree, 'baggage after open with target allocations');
});

test('claim rewards on Aave position successfully', async t => {
  const { trader1, common, started, zoe } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  t.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
  const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
  const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  const [done, cctpResult] = await Promise.all([
    actualP,
    cctpSettlementPromise,
    gmpSettlementPromise,
  ]);

  t.log('=== Portfolio completed, CCTP result:', cctpResult);
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

  await settleTransaction(zoe, resolverMakers, 2);

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const rebalanceResult = await rebalanceP;
  t.log('rebalance done', rebalanceResult);

  const messagesAfter = common.utils.inspectLocalBridge();

  t.deepEqual(messagesAfter.length - messagesBefore.length, 4);

  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');

  t.snapshot(rebalanceResult.payouts, 'rebalance payouts');
});

test('USDN claim fails currently', async t => {
  const { trader1, common } = await setupTrader(t);
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
  const { contents, positionPaths } = getPortfolioInfo(
    storagePath,
    common.bootstrap.storage,
  );
  t.log(
    'I can see where my money is:',
    positionPaths.map(p => contents[p].accountId),
  );
  t.is(contents[positionPaths[0]].accountId, `cosmos:noble-1:cosmos1test`);
  t.is(
    contents[storagePath].accountIdByChain['agoric'],
    `cosmos:agoric-3:${portfolio0lcaOrch}`,
    'LCA',
  );

  const rebalanceP = trader1.rebalance(
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

  await t.throwsAsync(rebalanceP, {
    message: /claiming USDN is not supported/,
  });
});

const beefyTestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, started, zoe } = await setupTrader(t);
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
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    t.log('ackd send to Axelar to create account');

    await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

    const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
    const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
    const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

    await simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    );
    const [actual, cctpResult] = await Promise.all([
      actualP,
      cctpSettlementPromise,
      gmpSettlementPromise,
    ]);

    t.log('=== Portfolio completed, CCTP result:', cctpResult);
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

test('Withdraw from a Beefy position', async t => {
  const { trader1, common, started, zoe } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  t.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
  const cctpSettlementPromise = settleTransaction(zoe, resolverMakers);
  const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );
  const [actual] = await Promise.all([
    actualP,
    cctpSettlementPromise,
    gmpSettlementPromise,
  ]);

  const result = actual.result as any;

  const withdrawP = trader1.rebalance(
    t,
    { give: {}, want: {} },
    {
      flow: [
        {
          src: 'Beefy_re7_Avalanche',
          dest: '@Arbitrum',
          amount: amount,
          fee: feeCall,
        },
        {
          src: '@Arbitrum',
          dest: '@noble',
          amount: amount,
        },
        {
          src: '@noble',
          dest: '@agoric',
          amount: amount,
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
  await settleTransaction(zoe, resolverMakers, 2);

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );

  // CCTP transaction settlement for the withdraw
  await settleTransaction(zoe, resolverMakers, 3);
  // Transaction settlement on noble for the withdraw
  await settleTransaction(zoe, resolverMakers, 4);

  const withdraw = await withdrawP;

  const { storagePath } = result.publicSubscribers.portfolio;
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(withdraw.payouts, 'refund payouts');
});

test('portfolios node updates for each new portfolio', async t => {
  const { makeFundedTrader, common } = await setupTrader(t);
  const { poc26 } = common.brands;
  const { storage } = common.bootstrap;

  const give = { Access: poc26.make(1n) };
  {
    const trader = await makeFundedTrader();
    await trader.openPortfolio(t, give);
    const x = storage.getDeserialized(`${ROOT_STORAGE_PATH}.portfolios`).at(-1);
    t.deepEqual(x, { addPortfolio: `portfolio0` });
  }
  {
    const trader = await makeFundedTrader();
    await trader.openPortfolio(t, give);
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
    const { trader1, common, started, zoe } = await setupTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(6_666.66);
    const amount_half = usdc.units(3_333.33);
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
            amount: amount_half,
            fee: feeAcct,
          },
          {
            src: '@noble',
            dest: '@Arbitrum',
            amount: amount_half,
            fee: feeAcct,
          },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration();
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    t.log('ackd send to Axelar to create account');

    await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

    await common.utils
      .transmitVTransferEvent('acknowledgementPacket', -1)
      .then(() => eventLoopIteration());
    await eventLoopIteration();

    const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);
    const cctpSettlementPromise = settleTransaction(zoe, resolverMakers, 0);

    await simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    );
    const gmpSettlementPromise = settleTransaction(zoe, resolverMakers, 1);

    await common.utils
      .transmitVTransferEvent('acknowledgementPacket', -1)
      .then(() => eventLoopIteration());
    await eventLoopIteration();

    const cctpSettlementPromise2 = settleTransaction(zoe, resolverMakers, 2);

    await simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    );

    await Promise.all([
      cctpSettlementPromise,
      cctpSettlementPromise2,
      gmpSettlementPromise,
    ]);
    const actual = await actualP;

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
);

test.serial('2 portfolios open EVM positions: parallel CCTP ack', async t => {
  const { trader1, common, started, zoe, trader2 } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;
  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);

  const addr2 = {
    lca: makeTestAddress(3), // agoric1q...rytxkw
    nobleICA: 'cosmos1test1',
    evm: '0xFbb89cC04ffb710b1f645b2cbEda0CE7D93294F4',
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
  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain);

  const open2P = trader2.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    depositToAave,
  );

  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );
  await simulateUpcallFromAxelar(
    common.mocks.transferBridge,
    sourceChain,
    addr2.evm,
    addr2.lca,
  );

  await Promise.all([
    settleTransaction(zoe, resolverMakers),
    settleTransaction(zoe, resolverMakers, 1),
  ]);

  await Promise.all([
    settleTransaction(zoe, resolverMakers, 2),
    settleTransaction(zoe, resolverMakers, 3),
  ]);

  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);

  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  for (const openP of [open1P, open2P]) {
    const { result, payouts } = await openP;
    t.deepEqual(payouts.Deposit, { brand: usdc.brand, value: 0n });
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const info = getPortfolioInfo(storagePath, common.bootstrap.storage);
    t.snapshot(info.contents, storagePath);
  }
});

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

test('start deposit more to same', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;

  const targetAllocation = {
    USDN: 60n,
    Aave_Arbitrum: 40n,
  };
  await trader1.openPortfolio(
    t,
    { Access: poc26.make(1n) },
    { targetAllocation },
  );

  const amount = usdc.units(3_333.33);
  const actualP = trader1.rebalance(
    t,
    { give: { Deposit: amount }, want: {} },
    {
      flow: [{ src: '<Deposit>', dest: '+agoric', amount }],
    },
  );

  const actual = await actualP;
  const result = actual.result as any;

  const info = await trader1.getPortfolioStatus();
  t.deepEqual(
    info.depositAddress,
    makeTestAddress(2), // ...64vywd
  );
});

test('redeem planner invitation', async t => {
  const { common, zoe, started, trader1 } = await setupTrader(t);

  const { storage } = common.bootstrap;
  const readAt: VStorage['readAt'] = async (path: string, _h?: number) => {
    await eventLoopIteration();
    const cell: StreamCell = {
      blockHeight: '0',
      values: storage.getValues(path),
    };
    return cell;
  };
  const readLegible = async (path: string) => {
    await eventLoopIteration();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };

  const boot = async () => {
    return {
      ...common.bootstrap,
      zoe,
      utils: { ...common.utils, readLegible },
    };
  };

  const { provisionSmartWallet } = await deployWalletFactory({ boot });
  const [walletPlanner] = await provisionSmartWallet('agoric1planner');
  const toPlan = await E(started.creatorFacet).makePlannerInvitation();
  await E(E(walletPlanner).getDepositFacet()).receive(toPlan);

  const planner1 = plannerClientMock(walletPlanner, started.instance, readAt);
  await planner1.redeem();

  await trader1.openPortfolio(t, {}, {});

  await planner1.submit1();
});

test('address of LCA for fees is published', async t => {
  const { common } = await deploy(t);
  const { storage } = common.bootstrap;
  await eventLoopIteration();
  const info = storage.getDeserialized(`${ROOT_STORAGE_PATH}`).at(-1);
  t.log(info);
  t.deepEqual(info, { contractAccount: makeTestAddress(0) });
});
