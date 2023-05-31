import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { SECONDS_PER_DAY } from '../../src/proposals/econ-behaviors.js';
import {
  makeAuctioneerDriver,
  makeDriverContext,
  makeManagerDriver,
} from './driver.js';

/**
 * @typedef {import('./driver.js').DriverContext & {
 * }} Context
 */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestLP', false);

test.before(async t => {
  // make interest slow because it's not the behavior under test
  t.context = await makeDriverContext({
    interestTiming: {
      chargingPeriod: SECONDS_PER_DAY,
      recordingPeriod: SECONDS_PER_DAY,
    },
  });
  trace(t, 'CONTEXT');
});

// This doesn't test much in CI. It's meant to be used as a quick way to test
// manually induced failures of calculateDistributionPlan. We want to be sure
// that liquidation is robust to unexpected failures, but we don't have a way to
// induce such failures in CI.
//
// We could have a double for the `proceeds.js` module but because it's an ESM
// module that would require running Ava with a custom Node loader. For example,
// https://github.com/testdouble/testdouble.js/blob/main/docs/7-replacing-dependencies.md#how-module-replacement-works-for-es-modules-using-import
//
// So instead we manually cause errors in the function and observe how the
// vault manager executes it, verifying that the resulting state is valid.
test('basic', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);
  await md.setGovernedParam('DebtLimit', run.units(1000), {
    key: { collateralBrand: aeth.brand },
  });
  const ad = await makeAuctioneerDriver(t);

  const v1collat = aeth.units(20.0);
  const v1debt = run.units(1.0);

  const v1 = await md.makeVaultDriver(v1collat, v1debt);
  const v2 = await md.makeVaultDriver(aeth.units(0.25), run.units(1));

  // bump LiquidationMargin so they are under
  await md.setGovernedParam('LiquidationMargin', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });
  // high penalties for easy math
  await md.setGovernedParam('LiquidationPenalty', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });

  await ad.advanceTimerByStartFrequency();
  await ad.advanceTimerByStartFrequency();

  await v1.notified('active', {
    locked: v1collat,
  });
  await v2.notified('liquidated', {
    locked: aeth.makeEmpty(),
  });
});
