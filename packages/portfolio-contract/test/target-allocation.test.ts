/**
 * @file Test target allocation functionality
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setupTrader } from './contract-setup.js';

const ackNFA = (utils, ix = 0) =>
  utils.transmitVTransferEvent('acknowledgementPacket', ix);

const test: TestFn<Awaited<ReturnType<typeof setupTrader>>> = anyTest;

test.before(async t => {
  t.context = await setupTrader(t);
});

test.serial('openPortfolio stores and publishes target allocation', async t => {
  const { common, makeFundedTrader } = t.context;
  const trader = await makeFundedTrader();

  // target: 60% USDN, 40% Aave on Arbitrum
  const targetAllocation = { USDN: 6000n, Aave_Arbitrum: 4000n };

  // Open portfolio with target allocation
  await Promise.all([
    trader.openPortfolio(t, {}, { targetAllocation }),
    ackNFA(common.utils),
  ]);

  // Verify target allocation is published to vstorage
  const portfolioStatus = await trader.getPortfolioStatus();
  t.deepEqual(portfolioStatus.targetAllocation, targetAllocation);
});

test.serial('setTargetAllocation rejects invalid pool keys', async t => {
  const { common, makeFundedTrader } = t.context;
  const trader = await makeFundedTrader();
  const { usdc } = common.brands;

  // Open portfolio first
  await Promise.all([
    trader.openPortfolio(t, { Deposit: usdc.units(1_000) }),
    ackNFA(common.utils, -1),
  ]);
  // Try to rebalance with invalid pool key
  const badTargetAllocation = {
    USDN: 5000n,
    InvalidProtocol: 5000n, // ← Should be rejected
  };

  await t.throwsAsync(
    () =>
      trader.rebalance(
        t,
        { give: {}, want: {} },
        { targetAllocation: badTargetAllocation },
      ),
    { message: /targetAllocation\?: InvalidProtocol/ },
  );
});

test.serial('multiple portfolios have independent allocations', async t => {
  const { common, makeFundedTrader } = t.context;
  const trader1 = await makeFundedTrader();
  const trader2 = await makeFundedTrader();

  // Set different target allocations for each portfolio
  const allocation1 = harden({
    USDN: 6000n, // 60%
    Aave_Arbitrum: 4000n, // 40%
  });

  const allocation2 = harden({
    USDN: 3000n, // 30%
    Compound_Optimism: 7000n, // 70%
  });

  // Open portfolios with different allocations
  await Promise.all([
    trader1.openPortfolio(t, {}, { targetAllocation: allocation1 }),
    ackNFA(common.utils, -1),
  ]);

  await Promise.all([
    trader2.openPortfolio(t, {}, { targetAllocation: allocation2 }),
    ackNFA(common.utils, -1),
  ]);

  // Verify each portfolio has its own independent allocation
  const status1 = await trader1.getPortfolioStatus();
  const status2 = await trader2.getPortfolioStatus();

  t.deepEqual(status1.targetAllocation, allocation1);
  t.deepEqual(status2.targetAllocation, allocation2);

  // Verify portfolios have different IDs
  t.not(trader1.getPortfolioId(), trader2.getPortfolioId());
});
