/**
 * @file YMax portfolio contract — core open/deposit/withdraw user stories
 *
 * Split from portfolio.contract.test.ts; shared helpers live in
 * contract-test-support.ts. Append new tests at the end for stable snapshots.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import {
  eventLoopIteration,
  inspectMapStore,
} from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { passStyleOf } from '@endo/far';
import { makeWallet } from '../tools/wallet-offer-tools.ts';
import {
  deploy,
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import { portfolio0lcaOrch } from './mocks.ts';
import {
  pendingTxOpts,
  snapshotTimed,
  documentStorageSchemaTimed,
  ackNFA,
  getPortfolioInfoTimed,
  keys,
} from './contract-test-support.ts';

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
  delete (tree as Record<string, unknown>).chainHub; // 'initial baggage' test captures this
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
  delete (tree as Record<string, unknown>).chainHub; // 'initial baggage' test captures this
  // XXX portfolio exo state not included UNTIL https://github.com/Agoric/agoric-sdk/issues/10950
  snapshotTimed(t, tree, 'baggage after open with target allocations');
});

test.skip('claim rewards on Aave position successfully', async t => {
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
          claimRewards: true,
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
