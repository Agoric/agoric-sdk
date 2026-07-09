/**
 * @file YMax portfolio contract — planner-driven flows
 *
 * Split from portfolio.contract.test.ts; shared helpers live in
 * contract-test-support.ts. Append new tests at the end for stable snapshots.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  type FlowDetail,
  type FundsFlowPlan,
  type MovementDesc,
} from '@agoric/portfolio-api';
import { E } from '@endo/far';
import { type TargetAllocation } from '../src/type-guards.ts';
import { setupTrader } from './contract-setup.ts';
import {
  getRunningFlowEntries,
  ackNFA,
  setupPlanner,
  makeCreateAndDepositScenarioRunner,
  keys,
} from './contract-test-support.ts';

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

  const pId: number = trader1.getPortfolioId();
  const resolveNextPlan = async (
    flowType?: FlowDetail['type'],
    plan: MovementDesc[] = [],
  ) => {
    const {
      flowsRunning = {},
      policyVersion,
      rebalanceCount,
    } = await trader1.getPortfolioStatus();
    t.is(keys(flowsRunning).length, 1);
    const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
    const fId = Number(flowId.replace('flow', ''));

    // narrow the type
    if (flowType !== undefined && detail.type !== flowType)
      throw t.fail(detail.type);

    await E(planner1.stub).resolvePlan(
      pId,
      fId,
      plan,
      policyVersion,
      rebalanceCount,
    );
    t.log('planner resolved plan');
  };

  const { usdc } = common.brands;
  const Deposit = usdc.units(3_333.33);
  t.log('trader1 deposits', Deposit, targetAllocation);
  await Promise.all([
    trader1.deposit(t, Deposit),
    resolveNextPlan('deposit', [
      { src: '<Deposit>', dest: '+agoric', amount: Deposit },
    ]),
  ]);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 1,
    rebalanceCount: 1,
  });

  t.log('user requests rebalance after yield makes things unbalanced');
  await Promise.all([
    trader1.simpleRebalance(t, { give: {}, want: {} }, { targetAllocation }),
    resolveNextPlan('rebalance', []),
  ]);
  t.like(await trader1.getPortfolioStatus(), {
    policyVersion: 2,
    rebalanceCount: 1,
  });

  t.log('trader re-sends the *same* targetAllocation as before');
  await Promise.all([
    trader1.simpleRebalance(t, { give: {}, want: {} }, { targetAllocation }),
    resolveNextPlan('rebalance', []),
  ]);
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
