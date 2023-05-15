import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { TimeMath } from '@agoric/time';
import { Far } from '@endo/marshal';
import '@agoric/zoe/exported.js';

import {
  computeRoundTiming,
  nextDescendingStepTime,
  timeVsSchedule,
} from '../../src/auction/scheduleMath.js';

/** @type {import('@agoric/time').TimerBrand} */
const timerBrand = Far('timerBrand');
const coerceAbs = time => TimeMath.coerceTimestampRecord(time, timerBrand);
const coerceRel = time => TimeMath.coerceRelativeTimeRecord(time, timerBrand);

const makeDefaultParams = ({
  freq = 3600,
  step = 600,
  delay = 300,
  discount = 1000n,
  lock = 15 * 60,
  lowest = 6_500n,
} = {}) => {
  return {
    getStartFrequency: () => coerceRel(freq),
    getClockStep: () => coerceRel(step),
    getStartingRate: () => 10_500n,
    getDiscountStep: () => discount,
    getPriceLockPeriod: () => coerceRel(lock),
    getLowestRate: () => lowest,
    getAuctionStartDelay: () => coerceRel(delay),
  };
};

/**
 * @param {any} t
 * @param {ReturnType<makeDefaultParams>} params
 * @param {number} baseTime
 * @param {any} rawExpect
 */
const checkSchedule = (t, params, baseTime, rawExpect) => {
  const schedule = computeRoundTiming(params, coerceAbs(baseTime));

  const expect = {
    startTime: coerceAbs(rawExpect.startTime),
    endTime: coerceAbs(rawExpect.endTime),
    steps: rawExpect.steps,
    endRate: rawExpect.endRate,
    startDelay: coerceRel(rawExpect.startDelay),
    clockStep: coerceRel(rawExpect.clockStep),
    lockTime: coerceAbs(rawExpect.lockTime),
  };
  t.deepEqual(schedule, expect);
};

/**
 * @param {any} t
 * @param {ReturnType<makeDefaultParams>} params
 * @param {number} baseTime
 */
const checkScheduleNull = (t, params, baseTime) => {
  const schedule = computeRoundTiming(params, coerceAbs(baseTime));

  t.is(schedule, undefined);
};

// Hourly starts. 4 steps down, 5 price levels. discount steps of 10%.
// 10.5, 9.5, 8.5, 7.5, 6.5. First start is 5 minutes after the hour.
test('simple schedule', checkSchedule, makeDefaultParams(), 100, {
  startTime: 3600 + 300,
  endTime: 3600 + 4 * 10 * 60 + 300,
  steps: 4n,
  endRate: 6_500n,
  startDelay: 300,
  clockStep: 600,
  lockTime: 3000,
});

test(
  'baseTime at a possible start',
  checkSchedule,
  makeDefaultParams({}),
  3600,
  {
    startTime: 7200 + 300,
    endTime: 7200 + 4 * 10 * 60 + 300,
    steps: 4n,
    endRate: 6_500n,
    startDelay: 300,
    clockStep: 600,
    lockTime: 6600,
  },
);

// Hourly starts. 8 steps down, 9 price levels. discount steps of 5%.
// First start is 5 minutes after the hour.
test(
  'finer steps',
  checkSchedule,
  makeDefaultParams({ step: 300, discount: 500n }),
  100,
  {
    startTime: 3600 + 300,
    endTime: 3600 + 8 * 5 * 60 + 300,
    steps: 8n,
    endRate: 6_500n,
    startDelay: 300,
    clockStep: 300,
    lockTime: 3000,
  },
);

// lock Period too Long
test(
  'long lock period',
  checkScheduleNull,
  makeDefaultParams({ lock: 3600 }),
  100,
);

test(
  'longer auction than freq',
  checkScheduleNull,
  makeDefaultParams({ freq: 500, lock: 300 }),
  100,
);

test(
  'startDelay too long',
  checkScheduleNull,
  makeDefaultParams({ delay: 5000 }),
  100,
);

test(
  'large discount step',
  checkScheduleNull,
  makeDefaultParams({ discount: 5000n }),
  100,
);

test(
  'one auction step',
  checkSchedule,
  makeDefaultParams({ discount: 2001n }),
  100,
  {
    startTime: 3600 + 300,
    endTime: 3600 + 600 + 300,
    steps: 1n,
    endRate: 10_500n - 2_001n,
    startDelay: 300,
    clockStep: 600,
    lockTime: 3000,
  },
);

test(
  'lowest rate higher than start',
  checkScheduleNull,
  makeDefaultParams({ lowest: 10_600n }),
  100,
);

// If the steps are small enough that we can't get to the end_rate, we'll cut
// the auction short when the next auction should start.
test(
  'very small discountStep',
  checkSchedule,
  makeDefaultParams({ discount: 10n }),
  100,
  {
    startTime: 3600 + 300,
    endTime: 3600 + 5 * 10 * 60 + 300,
    steps: 5n,
    endRate: 10_500n - 5n * 10n,
    startDelay: 300,
    clockStep: 600,
    lockTime: 3000,
  },
);

// if the discountStep is not a divisor of the price range, we'll end above the
// specified lowestRate.
test(
  'discountStep not a divisor of price range',
  checkSchedule,
  makeDefaultParams({ discount: 350n }),
  100,
  {
    startTime: 3600 + 300,
    endTime: 3600 + 5 * 10 * 60 + 300,
    steps: 5n,
    endRate: 10_500n - 5n * 350n,
    startDelay: 300,
    clockStep: 600,
    lockTime: 3000,
  },
);

const TWO_PM = 1680876000n;
const FIVE_MINUTES = 5n * 60n;
const FIFTEEN_MINUTES = 15n * 60n;
const defaults = makeDefaultParams();
const TWO_PM_SCHED = computeRoundTiming(defaults, TWO_PM - 1n);
const THREE_PM_SCHED = computeRoundTiming(defaults, TWO_PM);

const checkDescendingStep = (t, liveSchedule, nextSchedule, now, expected) => {
  const brand = nextSchedule.startTime.timerBrand;

  const nowTime = coerceAbs(now);
  t.deepEqual(
    nextDescendingStepTime(liveSchedule, nextSchedule, nowTime),
    coerceAbs(expected),
  );
};

test(
  'descendingSteps at start time',
  checkDescendingStep,
  TWO_PM_SCHED,
  THREE_PM_SCHED,
  TWO_PM,
  TWO_PM + FIVE_MINUTES,
);

test(
  'descendingSteps before start time',
  checkDescendingStep,
  TWO_PM_SCHED,
  THREE_PM_SCHED,
  TWO_PM - 1n,
  TWO_PM + FIVE_MINUTES,
);

test(
  'descendingSteps at first step',
  checkDescendingStep,
  TWO_PM_SCHED,
  THREE_PM_SCHED,
  TWO_PM + FIVE_MINUTES,
  TWO_PM + FIFTEEN_MINUTES,
);

test(
  'descendingSteps after first step start',
  checkDescendingStep,
  TWO_PM_SCHED,
  THREE_PM_SCHED,
  TWO_PM + FIVE_MINUTES + 1n,
  TWO_PM + FIFTEEN_MINUTES,
);

test(
  'descendingSteps at last step',
  checkDescendingStep,
  TWO_PM_SCHED,
  THREE_PM_SCHED,
  TWO_PM + 45n * 60n,
  TWO_PM + 60n * 60n + FIVE_MINUTES,
);

test(
  'descendingSteps between auctions',
  checkDescendingStep,
  undefined,
  THREE_PM_SCHED,
  TWO_PM + 45n * 60n + 1n,
  TWO_PM + 60n * 60n + FIVE_MINUTES,
);
