// @ts-check

import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { ceilMultiplyBy } from '@agoric/zoe/src/contractSupport/index.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/eventual-send';
import { makeTracer } from '../../src/makeTracer.js';
import '../../src/vaultFactory/types.js';
import {
  AT_NEXT,
  makeManagerDriver,
  makeDriverContext,
  Phase,
} from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {
 * }} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestLiq', false);

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('price drop', async t => {
  const { aeth, run, rates } = t.context;

  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.
  t.context.loanTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const d = await makeManagerDriver(t, run.make(1000n), aeth.make(900n));
  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = aeth.make(400n);
  const loanAmount = run.make(270n);
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, dv);
  const debtAmount = await dv.checkBorrowed(loanAmount, rates.loanFee);

  await dv.notified(Phase.ACTIVE, {
    debtSnapshot: {
      debt: debtAmount,
      interest: run.makeRatio(100n),
    },
  });
  await dv.checkBalance(debtAmount, collateralAmount);

  // small change doesn't cause liquidation
  await d.setPrice(run.make(677n));
  trace(t, 'price dropped a little');
  await d.tick();
  await dv.notified(Phase.ACTIVE);

  await d.setPrice(run.make(636n));
  trace(t, 'price dropped enough to liquidate');
  await dv.notified(Phase.LIQUIDATING, undefined, AT_NEXT);

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await dv.checkBalance(debtAmount, aeth.makeEmpty());
  const collateralExpected = aeth.make(210n);
  const debtExpected = run.makeEmpty();
  await dv.notified(Phase.LIQUIDATED, { locked: collateralExpected }, AT_NEXT);
  await dv.checkBalance(debtExpected, collateralExpected);

  await d.checkRewards(run.make(14n));

  await dv.close();
  await dv.notified(Phase.CLOSED, {
    locked: aeth.makeEmpty(),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await dv.checkBalance(debtExpected, aeth.makeEmpty());
});

test('price falls precipitously', async t => {
  const { aeth, run, rates } = t.context;
  t.context.loanTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const d = await makeManagerDriver(t, run.make(2200n), aeth.make(900n));
  // Create a loan for 370 RUN with 400 aeth collateral
  const collateralAmount = aeth.make(400n);
  const loanAmount = run.make(370n);
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, dv);
  const debtAmount = await dv.checkBorrowed(loanAmount, rates.loanFee);

  await dv.notified(Phase.ACTIVE, {
    debtSnapshot: {
      debt: debtAmount,
      interest: run.makeRatio(100n),
    },
  });
  await dv.checkBalance(debtAmount, collateralAmount);

  // Sell some aEth to drive the value down
  await d.sellOnAMM(aeth.make(200n), run.makeEmpty());

  // [2200n, 19180n, 1650n, 150n],
  await d.setPrice(run.make(19180n));
  await dv.checkBalance(debtAmount, collateralAmount);
  await d.tick();
  await dv.notified(Phase.ACTIVE);

  await d.setPrice(run.make(1650n));
  await d.tick();
  await dv.checkBalance(debtAmount, collateralAmount);
  await dv.notified(Phase.ACTIVE);

  // Drop price a lot
  await d.setPrice(run.make(150n));
  await dv.notified(Phase.LIQUIDATING, undefined, AT_NEXT);
  await dv.checkBalance(debtAmount, aeth.makeEmpty());
  // was run.make(103n)

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await dv.checkBalance(debtAmount, aeth.makeEmpty());
  const collateralExpected = aeth.make(141n);
  const debtExpected = run.makeEmpty();
  await dv.notified(Phase.LIQUIDATED, { locked: collateralExpected }, AT_NEXT);
  await dv.checkBalance(debtExpected, collateralExpected);

  await d.checkRewards(run.make(19n));

  await dv.close();
  await dv.notified(Phase.CLOSED, {
    locked: aeth.makeEmpty(),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await dv.checkBalance(debtExpected, aeth.makeEmpty());
});

test('update liquidator', async t => {
  const { aeth, run: debt } = t.context;
  t.context.runInitialLiquidity = debt.make(500_000_000n);
  t.context.aethInitialLiquidity = aeth.make(100_000_000n);

  const d = await makeManagerDriver(t, debt.make(500n), aeth.make(100n));
  const loanAmount = debt.make(300n);
  const collateralAmount = aeth.make(100n);
  /* * @type {UserSeat<VaultKit>} */
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  const debtAmount = await E(dv.vault()).getCurrentDebt();
  await dv.checkBalance(debtAmount, collateralAmount);

  let govNotify = await d.managerNotified();
  const oldLiquidator = govNotify.value.liquidatorInstance;
  trace(t, 'gov start', oldLiquidator, govNotify);
  await d.setGovernedParam(
    'LiquidationTerms',
    harden({
      MaxImpactBP: 80n,
      OracleTolerance: debt.makeRatio(30n),
      AMMMaxSlippage: debt.makeRatio(30n),
    }),
  );
  await eventLoopIteration();
  govNotify = await d.managerNotified();
  const newLiquidator = govNotify.value.liquidatorInstance;
  t.not(oldLiquidator, newLiquidator);

  // trigger liquidation
  await d.setPrice(debt.make(300n));
  await eventLoopIteration();
  await dv.notified(Phase.LIQUIDATED);
});

test('liquidate many', async t => {
  const { aeth, run, rates } = t.context;
  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.

  const overThreshold = async v => {
    const debt = await E(v.vault()).getCurrentDebt();
    return ceilMultiplyBy(
      ceilMultiplyBy(debt, rates.liquidationMargin),
      run.makeRatio(300n),
    );
  };
  const d = await makeManagerDriver(t, run.make(1500n), aeth.make(900n));
  const collateral = aeth.make(300n);
  const dv0 = await d.makeVaultDriver(collateral, run.make(390n));
  const dv1 = await d.makeVaultDriver(collateral, run.make(380n));
  const dv2 = await d.makeVaultDriver(collateral, run.make(370n));
  const dv3 = await d.makeVaultDriver(collateral, run.make(360n));
  const dv4 = await d.makeVaultDriver(collateral, run.make(350n));
  const dv5 = await d.makeVaultDriver(collateral, run.make(340n));
  const dv6 = await d.makeVaultDriver(collateral, run.make(330n));
  const dv7 = await d.makeVaultDriver(collateral, run.make(320n));
  const dv8 = await d.makeVaultDriver(collateral, run.make(310n));
  const dv9 = await d.makeVaultDriver(collateral, run.make(300n));

  await d.setPrice(await overThreshold(dv1));
  await eventLoopIteration();
  await dv0.notified(Phase.LIQUIDATED);
  await dv1.notified(Phase.ACTIVE);
  await dv2.notified(Phase.ACTIVE);
  await dv3.notified(Phase.ACTIVE);
  await dv4.notified(Phase.ACTIVE);
  await dv5.notified(Phase.ACTIVE);
  await dv6.notified(Phase.ACTIVE);
  await dv7.notified(Phase.ACTIVE);
  await dv8.notified(Phase.ACTIVE);
  await dv9.notified(Phase.ACTIVE);

  await d.setPrice(await overThreshold(dv5));
  await eventLoopIteration();
  await dv1.notified(Phase.LIQUIDATED);
  await dv2.notified(Phase.LIQUIDATED);
  await dv3.notified(Phase.LIQUIDATED);
  await dv4.notified(Phase.LIQUIDATED);
  await dv5.notified(Phase.ACTIVE);
  await dv6.notified(Phase.ACTIVE);
  await dv7.notified(Phase.ACTIVE);
  await dv8.notified(Phase.ACTIVE);
  await dv9.notified(Phase.ACTIVE);

  await d.setPrice(run.make(300n));
  await eventLoopIteration();
  await dv5.notified(Phase.LIQUIDATED);
  await dv6.notified(Phase.LIQUIDATED);
  await dv7.notified(Phase.LIQUIDATED);
  await dv8.notified(Phase.LIQUIDATED);
  await dv9.notified(Phase.LIQUIDATED);
});

// 1) `give` sells for more than `stopAfter`, and got some of the input back
test('amm stopAfter - input back', async t => {
  const { aeth, run } = t.context;
  const d = await makeManagerDriver(t, run.make(2_199n), aeth.make(999n));
  const give = aeth.make(100n);
  const want = run.make(80n);
  const stopAfter = run.make(100n);
  const expectedAeth = aeth.make(38n);
  const expectedRUN = stopAfter;
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

// 2) `give` wouldn't have sold for `stopAfter`, so sell it all
test('amm stopAfter - shortfall', async t => {
  const { aeth, run } = t.context;
  // uses off-by-one amounts to force rounding errors
  const d = await makeManagerDriver(t, run.make(2_199n), aeth.make(999n));
  const give = aeth.make(100n);
  const want = run.make(80n);
  // 164 is the most I could get
  const stopAfter = run.make(180n);
  const expectedAeth = aeth.makeEmpty();
  const expectedRUN = run.make(164n);
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

// 3) wouldn't have sold for enough, so sold everything,
//    and that still wasn't enough for `want.Out`
test('amm stopAfter - want too much', async t => {
  const { aeth, run } = t.context;
  // uses off-by-one amounts to force rounding errors
  const d = await makeManagerDriver(t, run.make(2_199n), aeth.make(999n));
  const give = aeth.make(100n);
  const want = run.make(170n);
  const stopAfter = run.make(180n);
  const expectedAeth = give;
  const expectedRUN = run.makeEmpty();
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

test('penalties to reserve', async t => {
  const { aeth, run } = t.context;

  const d = await makeManagerDriver(t, run.make(1000n), aeth.make(900n));
  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = aeth.make(400n);
  const loanAmount = run.make(270n);
  await d.makeVaultDriver(collateralAmount, loanAmount);

  // liquidate
  d.setPrice(run.make(636n));
  await eventLoopIteration();

  await d.checkReserveAllocation(1000n, 29n);
});
