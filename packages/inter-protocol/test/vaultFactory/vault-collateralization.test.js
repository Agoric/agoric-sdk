import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVC');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('totalDebt does not include compoundedInterest', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t); // TODO: thread timer step
  const timer = md.timer();
  const vfactory = md.getVaultDirectorPublic();

  t.log(
    '1. Have a large vault with some debt in a system in which the VaultManager.compoundedInterest is large',
  );

  // TODO: think about interest rate a bit... trying 720%
  // so 1 day is 2%
  await md.setGovernedParam('InterestRate', run.makeRatio(720n, 100n), {
    key: { collateralBrand: aeth.brand },
  });
  // plausible debt limit: $500k
  await md.setGovernedParam('DebtLimit', run.units(500000), {
    key: { collateralBrand: aeth.brand },
  });

  const vd = await md.makeVaultDriver(aeth.units(25), run.units(100));
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(105_000_000n));

  await E(timer).tickN(40, 'interest accumulates over 40hrs');
  await eventLoopIteration(); /// ????
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(106008000n));

  // check total debt
  const aethMgr = await E(vfactory).getCollateralManager(aeth.brand);
  t.log({ aethMgr });
  const topics = await E(aethMgr).getPublicTopics();
  t.log({ topics });

  const metricsNotifier = await makeNotifierFromSubscriber(
    topics.metrics.subscriber,
  );
  let updateCount;
  const managerNotification1 =
    await E(metricsNotifier).getUpdateSince(updateCount);
  t.like(managerNotification1.value.totalDebt, { value: 105000000n }, 'XXX');
  ({ updateCount } = managerNotification1);
  // const managerNotification2 =
  //   await E(metricsNotifier).getUpdateSince(updateCount);
  // t.like(managerNotification2.value.totalDebt, { value: 105_000_000n });
  // ({ updateCount } = managerNotification2);

  await md.managerNotified({
    compoundedInterest: {
      denominator: {
        value: 100000000000000000000n,
      },
      numerator: {
        value: 100960000000000000000n,
      },
    },
  });

  t.log('change the collateral of the vault with adjustBalance');
  await E(vd).giveCollateral(50n, aeth);

  t.log('vault debt now', await E(vd.vault()).getCurrentDebt());
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(106008000n));

  const managerNotification3 =
    await E(metricsNotifier).getUpdateSince(updateCount);
  t.like(
    managerNotification3.value.totalDebt,
    { value: 105_000_000n },
    'total debt stays the same',
  );
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
