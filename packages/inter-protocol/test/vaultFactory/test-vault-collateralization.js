import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {
 * }} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVC');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('excessive loan', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const threshold = 453n;
  await t.notThrowsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold)),
  );

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
    { message: /is more than the collateralization ratio allows/ },
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

  // TODO revisit after the new liquidation system https://github.com/Agoric/agoric-sdk/issues/5843
  // XXX make a worst collateralized vault for the head of the liquidation queue.
  // Without this, the test times out because adjusting a single vault triggers
  // `onHigherHighest` which calls `reschedulePriceCheck` which fires off a promise
  // for updating the quote, which never resolves. This isn't a problem in the
  // MinimumCollateralization test above so I think it's something to do with the assumptions
  // of the liquidation engine.
  await md.makeVaultDriver(aeth.make(1000n), run.make(4501n));

  // take debt that comes just shy of max
  const vd = await md.makeVaultDriver(aeth.make(1000n), run.make(4500n));
  t.deepEqual(await E(vd.vault()).getCurrentDebt(), run.make(4725n));

  // bump LiquidationMargin so they are under
  await md.setGovernedParam('LiquidationMargin', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });

  await t.throwsAsync(
    vd.giveCollateral(100n, aeth, 10n),
    { message: /is more than the collateralization ratio allows/ },
    'adjustment still under water',
  );

  t.log('trying to add collateral');
  await t.notThrowsAsync(
    vd.giveCollateral(100n, aeth),
    'giving collateral without any want still succeeds',
  );
});
