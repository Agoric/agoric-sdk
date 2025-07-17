/**
 * @file Test target allocation functionality
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
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
