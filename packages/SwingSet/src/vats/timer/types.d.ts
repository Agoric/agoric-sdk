/* eslint-disable no-use-before-define, no-undef */
import type { ERef } from '@endo/eventual-send';

import type { RankComparison } from '@agoric/store';

/// <reference types="@agoric/notifier/src/types.js"/>

declare global {
  /**
   * TODO As of PR #5821 there is no `TimerBrand` yet. The purpose of #5821
   * is to prepare the ground for time objects labeled by `TimerBrand` in
   * much the same way that `Amounts` are asset/money values labeled by
   * `Brands`.
   * As of #5821 (the time of this writing), a `TimerService` is actually
   * used everywhere a `TimerBrand` is called for.
   *
   * See https://github.com/Agoric/agoric-sdk/issues/5798
   * and https://github.com/Agoric/agoric-sdk/pull/5821
   */
  export type TimerBrand = {
    isMyTimer: (timer: TimerService) => ERef<boolean>;
  };

  /**
   * An absolute time returned by a TimerService. Note that different timer
   * services may have different interpretations of actual TimestampValue values.
   * Will generally be a count of some number of units starting at some starting
   * point. But what the starting point is and what units are counted is purely up
   * to the meaning of that particular TimerService
   */
  export type TimestampValue = bigint;

  /**
   * Difference between two TimestampValues.  Note that different timer services
   * may have different interpretations of TimestampValues values.
   */
  export type RelativeTimeValue = bigint;

  export type TimestampRecord = {
    timerBrand: TimerBrand;
    absValue: TimestampValue;
  };

  export type RelativeTimeRecord = {
    timerBrand: TimerBrand;
    relValue: RelativeTimeValue;
  };

  /**
   * Transitional measure until all are converted to TimestampRecord.
   * See `TimeMath` comment for an explanation of the representation
   * during this transition. After the transition, `Timestamp` will simplify
   * to the current definition of `TimestampRecord`, which will itself
   * be deleted. All Timestamps will then be labeled by TimerBrands.
   */
  export type Timestamp = TimestampRecord | TimestampValue;

  /**
   * Transitional measure until all are converted to RelativeTimeRecord
   * See `TimeMath` comment for an explanation of the representation
   * during this transition. After the transition, `RelativeTime` will simplify
   * to the current definition of `RelativeTimeRecord`, which will itself
   * be deleted. All RelativeTimes will then be labeled by TimerBrands.
   */
  export type RelativeTime = RelativeTimeRecord | RelativeTimeValue;

  /**
   * Gives the ability to get the current time,
   * schedule a single wake() call, create a repeater that will allow scheduling
   * of events at regular intervals, or remove scheduled calls.
   */
  export type TimerService = {
    /**
     * Retrieve the latest timestamp
     */
    getCurrentTimestamp: () => Timestamp;
    /**
     * Return value is the time at which the call is scheduled to take place
     */
    setWakeup: (baseTime: Timestamp, waker: ERef<TimerWaker>) => Timestamp;
    /**
     * Remove the waker
     * from all its scheduled wakeups, whether produced by `timer.setWakeup(h)` or
     * `repeater.schedule(h)`.
     */
    removeWakeup: (waker: ERef<TimerWaker>) => Array<Timestamp>;
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
    ) => TimerRepeater;
    /**
     * Create and return a Notifier that will deliver updates repeatedly at times
     * that are a multiple of interval following delay.
     */
    makeNotifier: (
      delay: RelativeTime,
      interval: RelativeTime,
    ) => Notifier<Timestamp>;
    /**
     * Create and return a promise that will resolve after the relative time has
     * passed.
     */
    delay: (delay: RelativeTime) => Promise<Timestamp>;
  };

  export type TimerWaker = {
    /**
     * The timestamp passed to `wake()` is the time that the call was scheduled
     * to occur.
     */
    wake: (timestamp: Timestamp) => void;
  };

  export type TimerRepeater = {
    /**
     * Returns the time scheduled for
     * the first call to `E(waker).wake()`.  The waker will continue to be scheduled
     * every interval until the repeater is disabled.
     */
    schedule: (waker: ERef<TimerWaker>) => Timestamp;
    /**
     * Disable this repeater, so `schedule(w)` can't
     * be called, and wakers already scheduled with this repeater won't be
     * rescheduled again after `E(waker).wake()` is next called on them.
     */
    disable: () => void;
  };

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
     * Coerces to a Timestamp if possible. If a brand is provided, ensure it
     * matches and return a Timestamp labeled with that brand.
     */
    toAbs: (abs: Timestamp | number, brand?: TimerBrand) => Timestamp;
    /**
     * Coerces to a RelativeTime if possible. If a brand is provided, ensure it
     * matches and return a RelativeTime labeled with that brand.
     */
    toRel: (rel: RelativeTime | number, brand?: TimerBrand) => RelativeTime;
    /**
     * An absolute time + a relative time gives a new absolute time.
     */
    addAbsRel: (abs: Timestamp, rel: RelativeTime) => Timestamp;
    /**
     * A relative time (i.e., a duration) + another relative time
     * gives a new relative time.
     */
    addRelRel: (rel1: RelativeTime, rel2: RelativeTime) => RelativeTime;
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
}
