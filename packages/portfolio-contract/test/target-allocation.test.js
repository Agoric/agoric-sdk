/**
 * @file Test target allocation functionality
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setupTrader } from './contract-setup.js';

test('openPortfolio stores and publishes target allocation', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc } = common.brands;

  // Simple target allocation: 60% USDN, 40% Aave on Arbitrum
  const targetAllocation = {
    USDN: 6000n, // 60% in basis points
    Aave_Arbitrum: 4000n, // 40% in basis points
  };

  // Open portfolio with target allocation
  await trader1.openPortfolio(
    t,
    { Deposit: usdc.units(1_000) },
    { targetAllocation },
  );

  // Verify target allocation is published to vstorage
  const portfolioStatus = await trader1.getPortfolioStatus();
  t.deepEqual(portfolioStatus.targetAllocation, targetAllocation);
});

test('setTargetAllocation rejects invalid pool keys', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc } = common.brands;

  // Open portfolio first
  await trader1.openPortfolio(t, { Deposit: usdc.units(1_000) });

  // Try to rebalance with invalid pool key
  const badTargetAllocation = {
    USDN: 5000n,
    InvalidProtocol: 5000n, // ← Should be rejected
  };

  await t.throwsAsync(
    () =>
      trader1.rebalance(
        t,
        { give: {}, want: {} },
        { targetAllocation: badTargetAllocation },
      ),
    { message: /targetAllocation\?: InvalidProtocol/ },
  );
});

test('multiple portfolios have independent allocations', async t => {
  const { common } = await setupTrader(t);
  const { usdc } = common.brands;

  // Create two separate traders
  const { trader1 } = await setupTrader(t, 5_000);
  const { trader1: trader2 } = await setupTrader(t, 7_000);

  // Set different target allocations for each portfolio
  const allocation1 = harden({
    USDN: 6000n, // 60%
    Aave_Arbitrum: 4000n, // 40%
  });

  const allocation2 = harden({
    USDN: 3000n, // 30%
    Compound_Ethereum: 7000n, // 70%
  });

  // Open portfolios with different allocations
  await trader1.openPortfolio(
    t,
    { Deposit: usdc.units(5_000) },
    { targetAllocation: allocation1 },
  );

  await trader2.openPortfolio(
    t,
    { Deposit: usdc.units(7_000) },
    { targetAllocation: allocation2 },
  );

  // Verify each portfolio has its own independent allocation
  const status1 = await trader1.getPortfolioStatus();
  const status2 = await trader2.getPortfolioStatus();

  t.deepEqual(status1.targetAllocation, allocation1);
  t.deepEqual(status2.targetAllocation, allocation2);

  // Verify portfolios have different IDs
  t.not(trader1.getPortfolioId(), trader2.getPortfolioId());
});
