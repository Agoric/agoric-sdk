import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { AT_NEXT, makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVC');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('totalDebt calculation includes compoundedInterest', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);
  const timer = md.timer();

  t.log('charge 2% per day to simulate lower rates over longer times');
  const aethKey = { collateralBrand: aeth.brand };
  const twoPctPerDay = run.makeRatio(2n * 360n, 100n);
  await md.setGovernedParam('InterestRate', twoPctPerDay, { key: aethKey });
  const plausibleDebtLimit = run.units(500000);
  await md.setGovernedParam('DebtLimit', plausibleDebtLimit, { key: aethKey });

  t.log('mint 100 IST against 25 AETH');
  const vd = await md.makeVaultDriver(aeth.units(25), run.units(100));
  const v1debtAfterMint = await E(vd.vault()).getCurrentDebt();
  t.deepEqual(v1debtAfterMint, run.units(100 + 5));
  // totalDebt is debit of this 1 vault
  await md.metricsNotified({ totalDebt: v1debtAfterMint }, AT_NEXT);

  await E(timer).tickN(40, 'interest accumulates over 40hrs');
  await eventLoopIteration(); // let all timer-induced promises settle
  const v1debtAfterDay = await E(vd.vault()).getCurrentDebt();
  t.deepEqual(v1debtAfterDay, run.make(106_008_000n));

  // Checking that totalDebt here matches v1debtAfterDay would be handy,
  // but totalDebt isn't updated when calculating interest.
  const expectedCompoundedInterest = {
    denominator: { value: 100000000000000000000n },
    numerator: { value: 100960000000000000000n },
  };
  await md.managerNotified({ compoundedInterest: expectedCompoundedInterest });

  t.log('give some collateral (adjustBalances); no change to debt');
  await E(vd).giveCollateral(50n, aeth);
  const v1debtAfterGive = await E(vd.vault()).getCurrentDebt();
  t.deepEqual(v1debtAfterGive, v1debtAfterDay, 'no debt change');

  await md.metricsNotified({ totalDebt: v1debtAfterDay }, AT_NEXT);
});

test('excessive loan', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const threshold = 453n;
  await md.makeVaultDriver(aeth.make(100n), run.make(threshold));

  await t.throwsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold + 1n)),
    {
      message: /Proposed debt.*477n.*exceeds max.*476n.*for.*100n/,
    },
  );
});

test('repay works regardless of debtLimit', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  // take debt that comes just shy of max
  const vd = await md.makeVaultDriver(aeth.make(1000n), run.make(4500n));
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(4725n));

  const MARGIN_HOP = 20n;

  // we can take a loan and pay it back
  await vd.giveCollateral(100n, aeth, MARGIN_HOP);
  await vd.giveMinted(MARGIN_HOP, aeth, 100n);

  // EC lowers mint limit
  await md.setGovernedParam('DebtLimit', run.make(1000n), {
    key: { collateralBrand: aeth.brand },
  });
  // we can still repay debt
  await vd.giveMinted(MARGIN_HOP, aeth);
});

test('add debt to vault under LiquidationMarging + LiquidationPadding', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  // take debt that comes just shy of max
  const vd = await md.makeVaultDriver(aeth.make(1000n), run.make(4500n));
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(4725n));

  const MARGIN_HOP = 20n;

  // we can take a loan and pay it back
  await vd.giveCollateral(100n, aeth, MARGIN_HOP);
  await vd.giveMinted(MARGIN_HOP, aeth, 100n);

  // but once we bump LiquidationPadding they are under
  await md.setGovernedParam('LiquidationPadding', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });
  // ...so we can't take the same loan out
  await t.throwsAsync(
    vd.giveCollateral(100n, aeth, MARGIN_HOP),
    { message: /Proposed debt.*exceeds max/ },
    'adjustment still under water',
  );

  await t.notThrowsAsync(
    vd.giveCollateral(100n, aeth),
    'giving collateral without any want still succeeds',
  );
});

test('add debt to vault under LiquidationMargin', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  // take debt that comes just shy of max
  const vd = await md.makeVaultDriver(aeth.make(1000n), run.make(4500n));
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(4725n));

  // bump LiquidationMargin so they are under
  await md.setGovernedParam('LiquidationMargin', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });

  // taking with the give fails
  await t.throwsAsync(
    vd.giveCollateral(100n, aeth, 10n),
    { message: /Proposed debt.*exceeds max/ },
    'adjustment still under water',
  );

  t.log('trying to add collateral');
  await t.notThrowsAsync(
    vd.giveCollateral(100n, aeth),
    'giving collateral without any want still succeeds',
  );
});
