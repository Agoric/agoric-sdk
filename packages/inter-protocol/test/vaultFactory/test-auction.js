import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { TimeMath } from '@agoric/time';
import { SECONDS_PER_DAY } from '../../src/proposals/econ-behaviors.js';
import {
  makeAuctioneerDriver,
  makeDriverContext,
  makeManagerDriver,
} from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestAuct');

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

test('reset auction params', async t => {
  const md = await makeManagerDriver(t);
  await md.setGovernedParam('ChargingPeriod', 10_000n);
  const ad = await makeAuctioneerDriver(t);

  const coerceRel = n =>
    TimeMath.coerceRelativeTimeRecord(n, t.context.timer.getTimerBrand());

  // XXX source from config
  const freq = 3600n;
  const delay = 2n;
  const schedule1 = {
    startTime: { absValue: freq + delay },
  };

  await ad.assertSchedulesLike(null, schedule1);
  await ad.advanceTimerByStartFrequency();
  const schedule2 = {
    startTime: { absValue: schedule1.startTime.absValue + freq },
  };
  await ad.assertSchedulesLike(schedule1, schedule2);

  // break params
  await ad.setGovernedParam('StartFrequency', coerceRel(0));

  await ad.advanceTimerByStartFrequency();
  t.log('"schedules killed');
  // liveSchedule isn't affected (yet), but nextSchedule is cleared
  await ad.assertSchedulesLike(schedule2, null);
  // show live schedule clear eventually
  await ad.advanceTimerByStartFrequency();
  await ad.assertSchedulesLike(null, null);

  // restore valid params
  await ad.setGovernedParam('StartFrequency', coerceRel(3600));

  // try triggering another liquidation
  await ad.advanceTimerByStartFrequency();

  await ad.assertSchedulesLike(
    { startTime: { absValue: schedule2.startTime.absValue + 2n * freq } },
    { startTime: { absValue: schedule2.startTime.absValue + 3n * freq } },
  );

  // keep going for good measure
  await ad.advanceTimerByStartFrequency();
  await ad.advanceTimerByStartFrequency();
  await ad.assertSchedulesLike(
    { startTime: { absValue: schedule2.startTime.absValue + 4n * freq } },
    { startTime: { absValue: schedule2.startTime.absValue + 5n * freq } },
  );
});

// TODO get this to induce CASE 2 of auction scheduling
// https://github.com/Agoric/agoric-sdk/issues/7781
test('timequake', async t => {
  const md = await makeManagerDriver(t);
  await md.setGovernedParam('ChargingPeriod', 10_000n);
  const ad = await makeAuctioneerDriver(t);

  // XXX source from config
  const freq = 3600n;
  const delay = 2n;
  const baseSchedule = {
    startTime: { absValue: freq + delay },
  };

  await ad.assertSchedulesLike(null, baseSchedule);
  await ad.advanceTimerByStartFrequency();
  const schedule2 = {
    startTime: { absValue: baseSchedule.startTime.absValue + freq },
  };
  await ad.assertSchedulesLike(baseSchedule, schedule2);

  await ad.induceTimequake();

  // recovery
  const schedule3 = { ...schedule2, startTime: { absValue: 43202n } };
  const schedule4 = { ...schedule3, startTime: { absValue: 46802n } };
  // liveSchedule isn't affected (yet), but nextSchedule is cleared
  await ad.assertSchedulesLike(schedule3, schedule4);

  // try triggering another liquidation
  await ad.advanceTimerByStartFrequency();

  // shouldn't the round advance?
  await ad.assertSchedulesLike(schedule3, schedule4);

  // keep going for good measure
  await ad.advanceTimerByStartFrequency();
  await ad.advanceTimerByStartFrequency();
  await ad.assertSchedulesLike(
    { startTime: { absValue: schedule4.startTime.absValue + 1n * freq } },
    { startTime: { absValue: schedule4.startTime.absValue + 2n * freq } },
  );
});
