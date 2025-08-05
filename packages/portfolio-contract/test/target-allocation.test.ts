/**
 * @file Test target allocation functionality
 */
import type { VstorageKit } from '@agoric/client-utils';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeTrader } from '../tools/portfolio-actors.js';
import { makeWallet } from '../tools/wallet-offer-tools.js';
import { setupTrader } from './contract-setup.js';

test('openPortfolio stores and publishes target allocation', async t => {
  const { trader1, common } = await setupTrader(t);
  const { usdc } = common.brands;

  // target: 60% USDN, 40% Aave on Arbitrum
  const targetAllocation = { USDN: 6000n, Aave_Arbitrum: 4000n };

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
  const { common, zoe, started } = await setupTrader(t);
  const { usdc, bld, poc26 } = common.brands;
  const { when } = common.utils.vowTools;

  const { storage } = common.bootstrap;
  const readPublished = (async subpath => {
    await eventLoopIteration();
    const val = storage.getDeserialized(`orchtest.${subpath}`).at(-1);
    return val;
  }) as unknown as VstorageKit['readPublished'];

  // Create two separate wallets and traders
  const { mint: _, ...poc26SansMint } = poc26;
  const { mint: _b, ...bldSansMint } = bld;

  const wallet1 = makeWallet(
    { USDC: usdc, BLD: bldSansMint, Access: poc26SansMint },
    zoe,
    when,
  );
  const wallet2 = makeWallet(
    { USDC: usdc, BLD: bldSansMint, Access: poc26SansMint },
    zoe,
    when,
  );

  // Fund both wallets
  await E(wallet1).deposit(await common.utils.pourPayment(usdc.units(5_000)));
  await E(wallet1).deposit(poc26.mint.mintPayment(poc26.make(1n)));
  await E(wallet1).deposit(bld.mint.mintPayment(bld.make(10_000n)));

  await E(wallet2).deposit(await common.utils.pourPayment(usdc.units(7_000)));
  await E(wallet2).deposit(poc26.mint.mintPayment(poc26.make(1n)));
  await E(wallet2).deposit(bld.mint.mintPayment(bld.make(10_000n)));

  const trader1 = makeTrader(wallet1, started.instance, readPublished);
  const trader2 = makeTrader(wallet2, started.instance, readPublished);

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
