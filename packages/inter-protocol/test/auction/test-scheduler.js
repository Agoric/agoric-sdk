import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { subscribeEach } from '@agoric/notifier';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { TimeMath } from '@agoric/time';
import { prepareMockRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { objectMap } from '@agoric/internal';

import {
  makeAuctioneerParamManager,
  makeAuctioneerParams,
} from '../../src/auction/params.js';
import { makeScheduler } from '../../src/auction/scheduler.js';
import { subscriptionTracker } from '../metrics.js';
import {
  getInvitation,
  makeDefaultParams,
  makeFakeAuctioneer,
  makeGovernancePublisherFromFakes,
  setUpInstallations,
} from './tools.js';

/** @typedef {import('@agoric/time/src/types').TimerService} TimerService */

test('schedule start to finish', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => bigint; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);

  const scheduleTracker = await subscriptionTracker(
    t,
    subscribeEach(recorderKit.subscriber),
  );
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    AuctionStartDelay: 1n,
    StartFreq: 10n,
    PriceLockPeriod: 5n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  /** @type {bigint} */
  let now = await timer.advanceTo(127n);

  const { publisher } = makeGovernancePublisherFromFakes();
  const paramManager = await makeAuctioneerParamManager(
    // @ts-expect-error test fakes
    { publisher, subscriber: null },
    zcf,
    paramValues,
  );

  const scheduler = await makeScheduler(
    fakeAuctioneer,
    timer,
    paramManager,
    timer.getTimerBrand(),
    recorderKit.recorder,
  );
  const schedule = scheduler.getSchedule();
  t.deepEqual(schedule.liveAuctionSchedule, undefined);
  const firstSchedule = {
    startTime: TimeMath.toAbs(131n, timerBrand),
    endTime: TimeMath.toAbs(135n, timerBrand),
    steps: 2n,
    endRate: 6500n,
    startDelay: TimeMath.toRel(1n, timerBrand),
    clockStep: TimeMath.toRel(2n, timerBrand),
    lockTime: TimeMath.toAbs(126n, timerBrand),
  };
  t.deepEqual(schedule.nextAuctionSchedule, firstSchedule);

  t.false(fakeAuctioneer.getState().final);
  t.is(fakeAuctioneer.getState().step, 0);
  t.false(fakeAuctioneer.getState().final);

  now = await timer.advanceTo(now + 1n);

  t.is(fakeAuctioneer.getState().step, 0);
  t.false(fakeAuctioneer.getState().final);

  await scheduleTracker.assertInitial({
    activeStartTime: undefined,
    nextDescendingStepTime: TimeMath.toAbs(131n, timerBrand),
    nextStartTime: TimeMath.toAbs(131n, timerBrand),
  });

  now = await timer.advanceTo(130n);
  await eventLoopIteration();
  now = await timer.advanceTo(now + 1n);
  await scheduleTracker.assertChange({
    activeStartTime: TimeMath.toAbs(131n, timerBrand),
    nextStartTime: { absValue: 141n },
  });

  const schedule2 = scheduler.getSchedule();
  t.deepEqual(schedule2.liveAuctionSchedule, firstSchedule);
  t.deepEqual(schedule2.nextAuctionSchedule, {
    startTime: TimeMath.toAbs(141n, timerBrand),
    endTime: TimeMath.toAbs(145n, timerBrand),
    steps: 2n,
    endRate: 6500n,
    startDelay: TimeMath.toRel(1n, timerBrand),
    clockStep: TimeMath.toRel(2n, timerBrand),
    lockTime: TimeMath.toAbs(136, timerBrand),
  });

  t.is(fakeAuctioneer.getState().step, 1);
  t.false(fakeAuctioneer.getState().final);

  // xxx I shouldn't have to tick twice.
  now = await timer.advanceTo(now + 1n);
  now = await timer.advanceTo(now + 1n);
  await eventLoopIteration();
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 133n },
  });

  t.is(fakeAuctioneer.getState().step, 2);
  t.false(fakeAuctioneer.getState().final);

  // final step
  now = await timer.advanceTo(now + 1n);
  now = await timer.advanceTo(now + 1n);
  await eventLoopIteration();
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 135n },
  });

  t.is(fakeAuctioneer.getState().step, 3);
  t.true(fakeAuctioneer.getState().final);

  // Auction finished, nothing else happens
  now = await timer.advanceTo(now + 1n);
  await scheduleTracker.assertChange({
    activeStartTime: undefined,
    nextDescendingStepTime: { absValue: 141n },
  });
  now = await timer.advanceTo(now + 1n);

  t.is(fakeAuctioneer.getState().step, 3);
  t.true(fakeAuctioneer.getState().final);

  t.deepEqual(fakeAuctioneer.getStartRounds(), [0]);

  const finalSchedule = scheduler.getSchedule();
  t.deepEqual(finalSchedule.liveAuctionSchedule, undefined);
  const secondSchedule = {
    startTime: TimeMath.toAbs(141n, timerBrand),
    endTime: TimeMath.toAbs(145n, timerBrand),
    steps: 2n,
    endRate: 6500n,
    startDelay: TimeMath.toRel(1n, timerBrand),
    clockStep: TimeMath.toRel(2n, timerBrand),
    lockTime: TimeMath.toAbs(136n, timerBrand),
  };
  t.deepEqual(finalSchedule.nextAuctionSchedule, secondSchedule);

  now = await timer.advanceTo(140n);
  await scheduleTracker.assertChange({
    activeStartTime: TimeMath.toAbs(141n, timerBrand),
    nextStartTime: { absValue: 151n },
  });

  t.deepEqual(finalSchedule.liveAuctionSchedule, undefined);
  t.deepEqual(finalSchedule.nextAuctionSchedule, secondSchedule);

  now = await timer.advanceTo(now + 1n);
  await eventLoopIteration();

  const schedule3 = scheduler.getSchedule();
  t.deepEqual(schedule3.liveAuctionSchedule, secondSchedule);
  t.deepEqual(schedule3.nextAuctionSchedule, {
    startTime: TimeMath.toAbs(151n, timerBrand),
    endTime: TimeMath.toAbs(155n, timerBrand),
    steps: 2n,
    endRate: 6500n,
    startDelay: TimeMath.toRel(1n, timerBrand),
    clockStep: TimeMath.toRel(2n, timerBrand),
    lockTime: TimeMath.toAbs(146n, timerBrand),
  });

  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 143n },
  });

  t.is(fakeAuctioneer.getState().step, 4);
  t.false(fakeAuctioneer.getState().final);

  // xxx I shouldn't have to tick twice.
  now = await timer.advanceTo(now + 1n);
  now = await timer.advanceTo(now + 1n);
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 145n },
  });

  t.is(fakeAuctioneer.getState().step, 5);
  t.false(fakeAuctioneer.getState().final);

  // final step
  now = await timer.advanceTo(now + 1n);
  now = await timer.advanceTo(now + 1n);

  t.is(fakeAuctioneer.getState().step, 6);
  t.true(fakeAuctioneer.getState().final);

  // Auction finished, nothing else happens
  now = await timer.advanceTo(now + 1n);
  await timer.advanceTo(now + 1n);

  await scheduleTracker.assertChange({
    activeStartTime: undefined,
    nextDescendingStepTime: { absValue: 151n },
  });

  t.is(fakeAuctioneer.getState().step, 6);
  t.true(fakeAuctioneer.getState().final);

  t.deepEqual(fakeAuctioneer.getStartRounds(), [0, 3]);
});

test('lowest >= starting', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);

  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    LowestRate: 110n,
    StartingRate: 105n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const { publisher } = makeGovernancePublisherFromFakes();
  const paramManager = await makeAuctioneerParamManager(
    // @ts-expect-error test fakes
    { publisher, subscriber: null },
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    { message: /startingRate "\[105n]" must be more than lowest: "\[110n]"/ },
  );
});

test('zero time for auction', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();
  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);

  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    StartFreq: 2n,
    ClockStep: 3n,
    AuctionStartDelay: 1n,
    PriceLockPeriod: 1n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    {
      message:
        /clockStep "\[3n]" must be shorter than startFrequency "\[2n]" to allow at least one step down/,
    },
  );
});

test('discountStep 0', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    DiscountStep: 0n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    { message: 'Division by zero' },
  );
});

test('discountStep larger than starting rate', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    StartingRate: 10100n,
    DiscountStep: 10500n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    { message: /discountStep .* too large for requested rates/ },
  );
});

test('start Freq 0', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    StartFreq: 0n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    { message: /startFrequency must exceed startDelay.*0n.*10n.*/ },
  );
});

test('delay > freq', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    AuctionStartDelay: 40n,
    StartFreq: 20n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    { message: /startFrequency must exceed startDelay.*\[20n\].*\[40n\].*/ },
  );
});

test('lockPeriod > freq', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  defaultParams = {
    ...defaultParams,
    PriceLockPeriod: 7200n,
    StartFreq: 3600n,
    AuctionStartDelay: 500n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  await t.throwsAsync(
    () =>
      makeScheduler(
        fakeAuctioneer,
        timer,
        paramManager,
        timer.getTimerBrand(),
        recorderKit.recorder,
      ),
    {
      message: /startFrequency must exceed lock period.*\[3600n\].*\[7200n\].*/,
    },
  );
});

// if duration = frequency, we'll cut the duration short to fit.
test('duration = freq', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  // start hourly, request 6 steps down every 10 minutes, so duration would be
  // 1 hour. Instead, cut the auction short.
  defaultParams = {
    ...defaultParams,
    PriceLockPeriod: 20n,
    StartFreq: 360n,
    AuctionStartDelay: 5n,
    ClockStep: 60n,
    StartingRate: 100n,
    LowestRate: 40n,
    DiscountStep: 10n,
  };
  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );

  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );

  const scheduler = await makeScheduler(
    fakeAuctioneer,
    timer,
    paramManager,
    timer.getTimerBrand(),
    recorderKit.recorder,
  );
  let schedule = scheduler.getSchedule();
  t.deepEqual(schedule.liveAuctionSchedule, undefined);
  const firstSchedule = {
    startTime: TimeMath.toAbs(365n, timerBrand),
    endTime: TimeMath.toAbs(665n, timerBrand),
    steps: 5n,
    endRate: 50n,
    startDelay: TimeMath.toRel(5n, timerBrand),
    clockStep: TimeMath.toRel(60n, timerBrand),
    lockTime: TimeMath.toAbs(345n, timerBrand),
  };
  t.deepEqual(schedule.nextAuctionSchedule, firstSchedule);

  await timer.advanceTo(345n);
  await timer.advanceTo(365n);
  await timer.advanceTo(665n);
  schedule = scheduler.getSchedule();

  const secondSchedule = {
    startTime: TimeMath.toAbs(725n, timerBrand),
    endTime: TimeMath.toAbs(1025n, timerBrand),
    steps: 5n,
    endRate: 50n,
    startDelay: TimeMath.toRel(5n, timerBrand),
    clockStep: TimeMath.toRel(60n, timerBrand),
    lockTime: TimeMath.toAbs(705n, timerBrand),
  };
  t.deepEqual(schedule.nextAuctionSchedule, secondSchedule);
});

test('change Schedule', async t => {
  const { zcf, zoe } = await setupZCFTest();
  const installations = await setUpInstallations(zoe);
  /** @type {TimerService & { advanceTo: (when: Timestamp) => void; }} */
  const timer = buildManualTimer();
  const timerBrand = await timer.getTimerBrand();

  const startFreq = 360n;
  const lockPeriod = 20n;
  const startDelay = 5n;
  const clockStep = 60n;

  const fakeAuctioneer = makeFakeAuctioneer();
  const { fakeInvitationPayment } = await getInvitation(zoe, installations);
  const publisherKit = makeGovernancePublisherFromFakes();

  const { makeRecorderKit, storageNode } = prepareMockRecorderKitMakers();
  const recorderKit = makeRecorderKit(storageNode);
  let defaultParams = makeDefaultParams(fakeInvitationPayment, timerBrand);
  // start hourly, request 6 steps down every 10 minutes, so duration would be
  // 1 hour. Instead, cut the auction short.

  /** @type {import('../../src/auction/params.js').AuctionParams} */
  defaultParams = {
    ...defaultParams,
    PriceLockPeriod: lockPeriod,
    StartFreq: startFreq,
    AuctionStartDelay: startDelay,
    ClockStep: clockStep,
    StartingRate: 100n,
    LowestRate: 40n,
    DiscountStep: 10n,
  };

  /** @type {import('../../src/auction/params.js').AuctionParams} */
  // @ts-expect-error ignore missing values for test
  const paramValues = objectMap(
    makeAuctioneerParams(defaultParams),
    r => r.value,
  );
  await timer.advanceTo(127n);

  const paramManager = await makeAuctioneerParamManager(
    publisherKit,
    zcf,
    paramValues,
  );
  // XXX let the value be set async. A concession to upgradability
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  await paramManager.getParams();

  const scheduler = await makeScheduler(
    fakeAuctioneer,
    timer,
    paramManager,
    timer.getTimerBrand(),
    recorderKit.recorder,
  );
  let schedule = scheduler.getSchedule();
  t.is(schedule.liveAuctionSchedule, undefined);

  const lockTime = 345n;
  const startTime = 365n;
  const endTime = 665n;

  const firstSchedule = {
    startTime: TimeMath.toAbs(startTime, timerBrand),
    endTime: TimeMath.toAbs(endTime, timerBrand),
    steps: 5n,
    endRate: 50n,
    startDelay: TimeMath.toRel(5n, timerBrand),
    clockStep: TimeMath.toRel(60n, timerBrand),
    lockTime: TimeMath.toAbs(lockTime, timerBrand),
  };
  t.deepEqual(schedule.nextAuctionSchedule, firstSchedule);

  await timer.advanceTo(lockTime);
  await timer.advanceTo(startTime);
  await timer.advanceTo(endTime);
  schedule = scheduler.getSchedule();

  const secondStart = startTime + startFreq;
  const secondEnd = endTime + startFreq;
  const expected2ndSchedule = {
    startTime: TimeMath.toAbs(secondStart, timerBrand),
    endTime: TimeMath.toAbs(secondEnd, timerBrand),
    steps: 5n,
    endRate: 50n,
    startDelay: TimeMath.toRel(5n, timerBrand),
    clockStep: TimeMath.toRel(60n, timerBrand),
    lockTime: TimeMath.toAbs(secondStart - lockPeriod, timerBrand),
  };
  t.deepEqual(schedule.nextAuctionSchedule, expected2ndSchedule);

  const newFreq = 100n;
  const newStep = 40n;
  paramManager.updateParams({
    StartFrequency: TimeMath.toRel(newFreq, timerBrand),
    ClockStep: TimeMath.toRel(newStep, timerBrand),
  });
  // XXX let the value be set async. A concession to upgradability
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  await paramManager.getParams();

  await timer.advanceTo(705n);
  await timer.advanceTo(secondStart);

  const remainder = (secondEnd + newFreq) % newFreq;
  const thirdStart = secondEnd + newFreq - remainder + startDelay;
  schedule = scheduler.getSchedule();
  t.deepEqual(schedule.liveAuctionSchedule, expected2ndSchedule);
  t.deepEqual(schedule.nextAuctionSchedule, {
    startTime: TimeMath.toAbs(thirdStart, timerBrand),
    endTime: TimeMath.toAbs(thirdStart + 2n * newStep, timerBrand),
    steps: 2n,
    endRate: 80n,
    startDelay: TimeMath.toRel(5n, timerBrand),
    clockStep: TimeMath.toRel(newStep, timerBrand),
    lockTime: TimeMath.toAbs(thirdStart - lockPeriod, timerBrand),
  });
});
