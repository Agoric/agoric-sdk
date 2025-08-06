/** @file YMax portfolio contract tests - user stories */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import type { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.ts';
import { passStyleOf } from '@endo/far';
import type { StatusFor } from '../src/type-guards.ts';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
  simulateUpcallFromAxelar,
} from './contract-setup.ts';
import { evmNamingDistinction, localAccount0 } from './mocks.ts';

const { fromEntries, keys } = Object;

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
    `cosmos:agoric-3:${localAccount0}`,
    'LCA',
  );
  t.snapshot(done.payouts, 'refund payouts');
});

test('open a portfolio with Aave position', async t => {
  const { trader1, common } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain).then(
    () =>
      simulateCCTPAck(common.utils).finally(() =>
        simulateAckTransferToAxelar(common.utils),
      ),
  );

  const actual = await actualP;
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
  const { trader1, common } = await setupTrader(t);
  const { bld, usdc, poc26 } = common.brands;

  const amount = usdc.units(3_333.33);
  const feeAcct = bld.make(100n);
  const feeCall = bld.make(100n);
  const actualP = trader1.openPortfolio(
    t,
    {
      Access: poc26.make(1n),
      Deposit: amount,
      GmpFee: AmountMath.add(feeAcct, feeCall),
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
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain).then(
    () =>
      simulateCCTPAck(common.utils).finally(() =>
        simulateAckTransferToAxelar(common.utils),
      ),
  );

  const actual = await actualP;
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
  const { trader1, common } = await setupTrader(t);
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
  console.log('openPortfolio, eventloop');
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to noble');

  const ackNP = await simulateUpcallFromAxelar(
    common.mocks.transferBridge,
    sourceChain,
  ).then(() =>
    simulateCCTPAck(common.utils).finally(() =>
      simulateAckTransferToAxelar(common.utils),
    ),
  );

  await eventLoopIteration(); // let bridge I/O happen

  const [done] = await Promise.all([doneP, ackNP]);
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(done.payouts, 'refund payouts');
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
        { src: '@noble', dest: 'Aave_Base', amount },
      ],
    },
  );

  await t.throwsAsync(rejectionP, {
    message: /Must match one of|Aave_Base/i,
  });
});

test('open portfolio with target allocations', async t => {
  const { trader1, common } = await setupTrader(t);
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
});

test('claim rewards on Aave position successfully', async t => {
  const { trader1, common } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain).then(
    () =>
      simulateCCTPAck(common.utils).finally(() =>
        simulateAckTransferToAxelar(common.utils),
      ),
  );

  const done = await actualP;
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

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const rebalanceResult = await rebalanceP;
  console.log('rebalance done', rebalanceResult);

  const messagesAfter = common.utils.inspectLocalBridge();

  t.deepEqual(messagesAfter.length - messagesBefore.length, 2);

  t.log(storagePath);
  const { contents, positionPaths, flowPaths } = getPortfolioInfo(
    storagePath,
    common.bootstrap.storage,
  );
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
    `cosmos:agoric-3:${localAccount0}`,
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

test('open a portfolio with Beefy position', async t => {
  const { trader1, common } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain).then(
    () =>
      simulateCCTPAck(common.utils).finally(() =>
        simulateAckTransferToAxelar(common.utils),
      ),
  );

  const actual = await actualP;
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');

  t.is(keys(result.publicSubscribers).length, 1);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.log(storagePath);
  const { contents } = getPortfolioInfo(storagePath, common.bootstrap.storage);
  t.snapshot(contents, 'vstorage');
  t.snapshot(actual.payouts, 'refund payouts');
});

test('Withdraw from a Beefy position', async t => {
  const { trader1, common } = await setupTrader(t);
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
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  await simulateUpcallFromAxelar(common.mocks.transferBridge, sourceChain).then(
    () =>
      simulateCCTPAck(common.utils).finally(() =>
        simulateAckTransferToAxelar(common.utils),
      ),
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

  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  await simulateCCTPAck(common.utils).finally(() =>
    simulateAckTransferToAxelar(common.utils),
  );
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
