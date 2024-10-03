/* eslint-disable no-use-before-define */
import type { ERef, RemotableBrand } from '@endo/eventual-send';

import type { RankComparison, RemotableObject } from '@endo/marshal';

// These aren't in the global runtime environment. They are just types that are
// meant to be globally accessible as a side-effect of importing this module.
/**
 * The TimerBrand is a unique object that represents the kind of Time
 * used in Timestamp/RelativeTime records. Times from different sources
 * are not comparable.
 *
 * Do not call `isMyTimerService(myTimerService)` on an untrusted
 * brand, because that will leak your closely-held timer authority. If
 * the goal is to check the suitability of a client-provided
 * Timestamp, use coerceTimestampRecord() or add/subtract it to a
 * known-good Timestamp, or extract its brand and === against
 * `timerService.getTimerBrand()`.
 *
 * TODO Not all Timestamps are labeled with the TimerBrand (in much
 * the same way that `Amounts` are asset/money values labeled by
 * `Brands`), but the SwingSet vat-timer TimerService will use branded
 * TimestampRecord/RelativeTimeRecord in all messages it emits. Also,
 * a `TimerService` is still used everywhere a `TimerBrand` is called
 * for.
 *
 * See https://github.com/Agoric/agoric-sdk/issues/5798
 * and https://github.com/Agoric/agoric-sdk/pull/5821
 */
export type TimerBrand = RemotableObject & {
  isMyTimerService: (timer: TimerService) => ERef<boolean>;
  isMyClock: (clock: Clock) => ERef<boolean>;
};

/**
 * @deprecated use TimestampRecord
 *
 * An absolute time returned by a TimerService. Note that different timer
 * services may have different interpretations of actual TimestampValue values.
 * Will generally be a count of some number of units starting at some starting
 * point. But what the starting point is and what units are counted is purely up
 * to the meaning of that particular TimerService
 */
export type TimestampValue = bigint;

/**
 * @deprecated use RelativeTimeRecord
 *
 * Difference between two TimestampValues.  Note that different timer services
 * may have different interpretations of TimestampValues values.
 */
export type RelativeTimeValue = bigint;

/**
 * The canonical representation of a typed absolute time. It bundles the brand
 * with the time, as represented by a TimerService, which might represent time
 * since the epoch, or blockheight on a particular chain.
 */
export type TimestampRecord = {
  timerBrand: TimerBrand;
  absValue: bigint;
};

/**
 * The canonical representation of a typed relative time. It bundles the brand
 * with an elapsed time, as represented by a TimerService, which might represent
 * time since the epoch, or blockheight on a particular chain.
 */
export type RelativeTimeRecord = {
  timerBrand: TimerBrand;
  relValue: bigint;
};

/**
 * @deprecated use TimestampRecord
 *
 * Transitional measure until all are converted to TimestampRecord.
 * See `TimeMath` comment for an explanation of the representation
 * during this transition. After the transition, `Timestamp` will simplify
 * to the current definition of `TimestampRecord`, which will itself
 * be deleted. All Timestamps will then be labeled by TimerBrands.
 */
export type Timestamp = TimestampRecord | TimestampValue;

/**
 * @deprecated use RelativeTimeRecord
 *
 * Transitional measure until all are converted to RelativeTimeRecord
 * See `TimeMath` comment for an explanation of the representation
 * during this transition. After the transition, `RelativeTime` will simplify
 * to the current definition of `RelativeTimeRecord`, which will itself
 * be deleted. All RelativeTimes will then be labeled by TimerBrands.
 */
export type RelativeTime = RelativeTimeRecord | RelativeTimeValue;

/**
 * A CancelToken is an arbitrary marker object, passed in with
 * each API call that creates a wakeup or repeater, and passed to
 * cancel() to cancel them all. Multiple wakeups can rely on the same
 * CancelToken so they can be cancelled collectively.
 */
export type CancelToken = object;

/**
 * Gives the ability to get the current time,
 * schedule a single wake() call, create a repeater that will allow scheduling
 * of events at regular intervals, or remove scheduled calls.
 */
export interface TimerServiceI {
  /**
   * Retrieve the latest timestamp
   */
  getCurrentTimestamp: () => TimestampRecord;
  /**
   * Return value is the time at which the call is scheduled to take place
   */
  setWakeup: (
    baseTime: Timestamp,
    waker: ERef<TimerWaker>,
    cancelToken?: CancelToken,
  ) => TimestampRecord;
  /**
   * Create and return a promise that will resolve after the absolute
   * time has passed.
   */
  wakeAt: (
    baseTime: Timestamp,
    cancelToken?: CancelToken,
  ) => Promise<TimestampRecord>;
  /**
   * Create and return a promise that will resolve after the relative time has
   * passed.
   */
  delay: (
    delay: RelativeTime,
    cancelToken?: CancelToken,
  ) => Promise<TimestampRecord>;
  /**
   * Create and return a repeater that will schedule `wake()` calls
   * repeatedly at times that are a multiple of interval following delay.
   * Interval is the difference between successive times at which wake will be
   * called.  When `schedule(w)` is called, `w.wake()` will be scheduled to be
   * called after the next multiple of interval from the base. Since times can be
   * coarse-grained, the actual call may occur later, but this won't change when
   * the next event will be called.
   */
  makeRepeater: (
    delay: RelativeTime,
    interval: RelativeTime,
    cancelToken?: CancelToken,
  ) => TimerRepeater;
  /**
   * Create a repeater with a handler directly.
   */
  repeatAfter: (
    delay: RelativeTime,
    interval: RelativeTime,
    handler: TimerWaker,
    cancelToken?: CancelToken,
  ) => void;
  /**
   * Create and return a Notifier that will deliver updates repeatedly at times
   * that are a multiple of interval following delay.
   */
  makeNotifier: (
    delay: RelativeTime,
    interval: RelativeTime,
    cancelToken?: CancelToken,
  ) => import('@agoric/notifier').Notifier<TimestampRecord>;
  /**
   * Cancel a previously-established wakeup or repeater.
   */
  cancel: (cancelToken: CancelToken) => void;
  /**
   * Retrieve the read-only Clock facet.
   */
  getClock: () => Clock;
  /**
   * Retrieve the Brand for this timer service.
   */
  getTimerBrand: () => TimerBrand;
}
// XXX copied from Remotable helper return type
export type TimerService = TimerServiceI &
  RemotableObject<'TimerService'> &
  RemotableBrand<{}, TimerServiceI>;

/**
 * Read-only access to a TimeService's current time. This allows reading the
 * current time (e.g. to see if a deadline has passed) without the ability to
 * schedule events.
 */
export interface Clock {
  /**
   * Retrieve the latest timestamp
   */
  getCurrentTimestamp: () => TimestampRecord;
  /**
   * Retrieve the Brand for this timer service.
   */
  getTimerBrand: () => TimerBrand;
}

/**
 * The interface that must be implemented by objects which are to be invoked at
 * scheduled times. Used by `TimerService.repeatAfter()`,
 * `TimerService.setWakeup()`, and `TimerRepeater.schedule()`.
 */
export interface TimerWaker {
  /**
   * The timestamp passed to `wake()` is the time that the call was scheduled
   * to occur.
   */
  wake: (timestamp: TimestampRecord) => void;
}

/**
 * Provides the ability to schedule wake() calls repeatedly at a regular
 * interval, or to disable all future use of this TimerRepeater. Created by the
 * deprecated makeRepeater(), new code should use repeatAfter(), which doesn't
 * have a control object and doesn't require a second schedule step
 */
export interface TimerRepeater {
  /**
   * Returns the time scheduled for
   * the first call to `E(waker).wake()`.  The waker will continue to be scheduled
   * every interval until the repeater is disabled.
   */
  schedule: (waker: ERef<TimerWaker>) => TimestampRecord;
  /**
   * Disable this repeater, so `schedule(w)` can't
   * be called, and wakers already scheduled with this repeater won't be
   * rescheduled again after `E(waker).wake()` is next called on them.
   */
  disable: () => void;
}

/**
 * TimeMath supports simple arithmetic on typed Time values, enforcing that
 * values are combined in type-compatible ways. You can add 3 minutes to 3pm,
 * or 5 minutes to a half hour, but it makes no sense to add 3pm and 5pm.
 * Subtracting two Timestamps does produce a useful difference.
 *
 * The brands prevent you from accidentally combining time values from different
 * TimerServices. Some chains track time in blocks, others follow wall clock
 * time, some do both. Every local computer has its own unique notion of wall
 * clock time. Even when these clocks are talking about the same thing (UTC),
 * they can all drift in different ways. Using the correct brands lets you be
 * precise about which particular source of time you mean, preventing confusion
 * or attacks when the clocks diverge. Thus it is an error to e.g. use a time
 * you got from chain A to schedule an event on chain B.
 *
 * The basic types are `RelativeTimeRecord` (durations) and `TimestampRecord`. The numeric
 * values can be extracted from the typed values, but it's usually better to
 * maintain values as their canonical typed form so these operations can be
 * applied.
 */
export type TimeMathType = {
  /**
   * Validates that the operand represents a `Timestamp` and returns the bigint
   * representing its absolute time value.
   * During the transition explained in the`TimeMath` comment,
   * `absValue` will also accept a bigint which it then just returns.
   */
  absValue: (abs: Timestamp) => TimestampValue;
  /**
   * Validates that the operand represents a `RelativeTime` and returns the
   * bigint representing its relative time value.
   * During the transition explained in the`TimeMath` comment,
   * `relValue` will also accept a bigint which it then just returns.
   */
  relValue: (rel: RelativeTime) => RelativeTimeValue;

  /**
   * Coerces to a TimestampRecord if possible, else throws. If the value has a brand, ensure it matches.
   * Return a Timestamp labeled with that brand.
   */
  coerceTimestampRecord: (
    abs: TimestampRecord | TimestampValue | number,
    brand: TimerBrand,
  ) => TimestampRecord;
  /**
   * Coerces to a RelativeTime if possible. If a brand is provided, ensure it
   * matches and return a RelativeTime labeled with that brand.
   */
  coerceRelativeTimeRecord: (
    rel: RelativeTimeRecord | RelativeTimeValue | number,
    brand: TimerBrand,
  ) => RelativeTimeRecord;
  /**
   * An absolute time + a relative time gives a new absolute time.
   */
  addAbsRel: <T extends Timestamp>(
    abs: T,
    rel: RelativeTime,
  ) => T extends TimestampRecord ? TimestampRecord : TimestampValue;
  /**
   * A relative time (i.e., a duration) + another relative time
   * gives a new relative time.
   */
  addRelRel: <T extends RelativeTime>(
    rel1: T,
    rel2: T,
  ) => T extends RelativeTimeRecord ? RelativeTimeRecord : RelativeTimeValue;
  /**
   * The difference between two absolute times is a relative time. If abs1 > abs2
   * the difference would be negative, so this method throws instead.
   */
  subtractAbsAbs: (abs1: Timestamp, abs2: Timestamp) => RelativeTime;
  /**
   * The difference between two absolute times is a relative time. If abs1 > abs2
   * the difference would be negative, so this method returns a zero
   * relative time instead.
   */
  clampedSubtractAbsAbs: (abs1: Timestamp, abs2: Timestamp) => RelativeTime;
  /**
   * An absolute time - a relative time gives a new absolute time
   */
  subtractAbsRel: (abs: Timestamp, rel: RelativeTime) => Timestamp;
  /**
   * The difference between two relative times.
   */
  subtractRelRel: (rel1: RelativeTime, rel2: RelativeTime) => RelativeTime;
  /**
   * Does it represent a zero relative time, i.e., the difference
   * of an absolute time with itself? (We choose not to define a similar
   * isAbsZero, even though we could, because it is much less likely to be
   * meaningful.)
   */
  isRelZero: (rel: RelativeTime) => boolean;
  multiplyRelNat: (rel: RelativeTime, nat: bigint) => RelativeTime;
  divideRelNat: (rel: RelativeTime, nat: bigint) => RelativeTime;
  divideRelRel: (rel1: RelativeTime, rel2: RelativeTime) => bigint;
  /**
   * An absolute time modulo a relative time is a relative time. For example,
   * 20:17 on July 20, 1969 modulo 1 day is just 20:17, a relative time that
   * can be added to the beginning of any day.
   */
  modAbsRel: (abs: Timestamp, step: RelativeTime) => RelativeTime;
  /**
   * A relative time modulo a relative time is a relative time. For example,
   * 3.5 hours modulo an hour is 30 minutes.
   */
  modRelRel: (rel: RelativeTime, step: RelativeTime) => RelativeTime;
  /**
   * Compares two absolute times. This comparison function is compatible
   * with JavaScript's `Array.prototype.sort` and so can be used to sort an
   * array of absolute times. The result is -1, 0, or 1 indicating whether
   * the first argument is less than, equal, or greater than the second.
   */
  compareAbs: (abs1: Timestamp, abs2: Timestamp) => RankComparison;
  /**
   * Compares two relative times. This comparison function is compatible
   * with JavaScript's `Array.prototype.sort` and so can be used to sort an
   * array of relative times. The result is -1, 0, or 1 indicating whether
   * the first argument is less than, equal, or greater than the second.
   */
  compareRel: (rel1: RelativeTime, rel2: RelativeTime) => RankComparison;
};
