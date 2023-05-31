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

const trace = makeTracer('TestLP');

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

test('first', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);
  await md.setGovernedParam('DebtLimit', run.units(1000), {
    key: { collateralBrand: aeth.brand },
  });
  const ad = await makeAuctioneerDriver(t);

  const v1collat = aeth.units(2.0);
  const v1debt = run.units(1.0);

  const v1 = await md.makeVaultDriver(v1collat, v1debt);

  // bump LiquidationMargin so they are under
  await md.setGovernedParam('LiquidationMargin', run.makeRatio(20n, 1n), {
    key: { collateralBrand: aeth.brand },
  });

  const totalPenalty = aeth.units(0.021);

  await ad.advanceTimerByStartFrequency();
  await ad.advanceTimerByStartFrequency();

  await v1.notified('active', {
    locked: AmountMath.subtract(v1collat, totalPenalty),
  });
});
