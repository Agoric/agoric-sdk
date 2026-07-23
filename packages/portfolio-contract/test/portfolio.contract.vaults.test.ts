/**
 * @file YMax portfolio contract — Beefy/ERC4626 vault positions
 *
 * Split from portfolio.contract.test.ts; shared helpers live in
 * contract-test-support.ts. Append new tests at the end for stable snapshots.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import {
  pendingTxOpts,
  snapshotTimed,
  documentStorageSchemaTimed,
  ackNFA,
  beefyTestMacro,
  getPortfolioInfoTimed,
  erc4626TestMacro,
} from './contract-test-support.ts';

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
        { src: '@noble', dest: '@Avalanche', amount, fee: feeAcct },
        {
          src: '@Avalanche',
          dest: 'Beefy_re7_Avalanche',
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
          src: 'Beefy_re7_Avalanche',
          dest: '@Avalanche',
          amount,
          fee: feeCall,
        },
        {
          src: '@Avalanche',
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
        { src: '@noble', dest: '@Ethereum', amount, fee: feeAcct },
        {
          src: '@Ethereum',
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
          dest: '@Ethereum',
          amount,
          fee: feeCall,
        },
        {
          src: '@Ethereum',
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

test('claim rewards on Compound position successfully', async t => {
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
        { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount, fee: feeCall },
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
          src: 'Compound_Arbitrum',
          amount: usdc.make(100n),
          fee: feeCall,
          claimRewards: {},
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
