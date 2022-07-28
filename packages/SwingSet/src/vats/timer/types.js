// @ts-check

/**
 * @typedef {object} TimerBrand
 * TODO As of PR #5821 there is no `TimerBrand` yet. The purpose of #5821
 * is to prepare the ground for time objects labeled by `TimerBrand` in
 * much the same way that `Amounts` are asset/money values labeled by
 * `Brands`.
 * As of #5821 (the time of this writing), a `TimerService` is actually
 * used everywhere a `TimerBrand` is called for.
 *
 * See https://github.com/Agoric/agoric-sdk/issues/5798
 * and https://github.com/Agoric/agoric-sdk/pull/5821
 * @property {(timer: TimerService) => ERef<boolean>} isMyTimer
 */

/**
 * @typedef {bigint} TimestampValue
 * An absolute time returned by a
 * TimerService. Note that different timer services may have different
 * interpretations of actual TimestampValue values. Will generally be
 * a count of some number of units starting at some starting
 * point. But what the starting point is and what units are counted
 * is purely up to the meaning of that particular TimerService
 *
 * @typedef {bigint} RelativeTimeValue
 * Difference between two TimestampValues.  Note that
 * different timer services may have different interpretations of
 * TimestampValues values.
 */

/**
 * @typedef {object} TimestampRecord
 * @property {TimerBrand} timerBrand
 * @property {TimestampValue} absValue
 */

/**
 * @typedef {object} RelativeTimeRecord
 * @property {TimerBrand} timerBrand
 * @property {RelativeTimeValue} relValue
 */

/**
 * @typedef {TimestampRecord | TimestampValue} Timestamp
 * Transitional measure until all are converted to TimestampRecord.
 * See `TimeMath` comment for an explanation of the representation
 * during this transition. After the transition, `Timestamp` will simplify
 * to the current definition of `TimestampRecord`, which will itself
 * be deleted. All Timestamps will then be labeled by TimerBrands.
 */

/**
 * @typedef {RelativeTimeRecord | RelativeTimeValue} RelativeTime
 * Transitional measure until all are converted to RelativeTimeRecord
 * See `TimeMath` comment for an explanation of the representation
 * during this transition. After the transition, `RelativeTime` will simplify
 * to the current definition of `RelativeTimeRecord`, which will itself
 * be deleted. All RelativeTimes will then be labeled by TimerBrands.
 */

/**
 * @typedef {object} TimerService
 * Gives the ability to get the current time,
 * schedule a single wake() call, create a repeater that will allow scheduling
 * of events at regular intervals, or remove scheduled calls.
 *
 * @property {() => Timestamp} getCurrentTimestamp
 * Retrieve the latest timestamp
 *
 * @property {(baseTime: Timestamp,
 *             waker: ERef<TimerWaker>
 * ) => Timestamp} setWakeup
 * Return value is the time at which the call is scheduled to take place
 *
 * @property {(waker: ERef<TimerWaker>) => Array<Timestamp>} removeWakeup
 * Remove the waker
 * from all its scheduled wakeups, whether produced by `timer.setWakeup(h)` or
 * `repeater.schedule(h)`.
 *
 * @property {(delay: RelativeTime,
 *             interval: RelativeTime
 * ) => TimerRepeater} makeRepeater
 * Create and return a repeater that will schedule `wake()` calls
 * repeatedly at times that are a multiple of interval following delay.
 * Interval is the difference between successive times at which wake will be
 * called.  When `schedule(w)` is called, `w.wake()` will be scheduled to be
 * called after the next multiple of interval from the base. Since times can be
 * coarse-grained, the actual call may occur later, but this won't change when
 * the next event will be called.
 *
 * @property {(delay: RelativeTime,
 *             interval: RelativeTime
 * ) => Notifier<Timestamp>} makeNotifier
 * Create and return a Notifier that will deliver updates repeatedly at times
 * that are a multiple of interval following delay.
 *
 * @property {(delay: RelativeTime) => Promise<Timestamp>} delay
 * Create and return a promise that will resolve after the relative time has
 * passed.
 */

/**
 * @typedef {object} TimerWaker
 *
 * @property {(timestamp: Timestamp) => void} wake The timestamp passed to
 * `wake()` is the time that the call was scheduled to occur.
 */

/**
 * @typedef {object} TimerRepeater
 *
 * @property {(waker: ERef<TimerWaker>) => Timestamp} schedule
 * Returns the time scheduled for
 * the first call to `E(waker).wake()`.  The waker will continue to be scheduled
 * every interval until the repeater is disabled.
 *
 * @property {() => void} disable
 * Disable this repeater, so `schedule(w)` can't
 * be called, and wakers already scheduled with this repeater won't be
 * rescheduled again after `E(waker).wake()` is next called on them.
 */

/**
 * @typedef TimeMathType
 * @property {(abs: Timestamp) => TimestampValue} absValue
 * Validates that the operand represents a `Timestamp` and returns the bigint
 * representing its absolute time value.
 * During the transition explained in the`TimeMath` comment,
 * `absValue` will also accept a bigint which it then just returns.
 *
 * @property {(rel: RelativeTime) => RelativeTimeValue} relValue
 * Validates that the operand represents a `RelativeTime` and returns the
 * bigint representing its relative time value.
 * During the transition explained in the`TimeMath` comment,
 * `relValue` will also accept a bigint which it then just returns.
 *
 * @property {(abs: Timestamp | number, brand?: TimerBrand) => Timestamp} toAbs
 * Coerces to a Timestamp if possible. If a brand is provided, ensure it
 * matches and return a Timestamp labeled with that brand.
 *
 * @property {(rel: RelativeTime | number, brand?: TimerBrand) => RelativeTime} toRel
 * Coerces to a RelativeTime if possible. If a brand is provided, ensure it
 * matches and return a RelativeTime labeled with that brand.
 *
 * @property {(abs: Timestamp, rel: RelativeTime) => Timestamp} addAbsRel
 * An absolute time + a relative time gives a new absolute time.
 *
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => RelativeTime} addRelRel
 * A relative time (i.e., a duration) + another relative time
 * gives a new relative time.
 *
 * @property {(abs1: Timestamp, abs2: Timestamp) => RelativeTime} subtractAbsAbs
 * The difference between two absolute times is a relative time. If abs1 > abs2
 * the difference would be negative, so this method throws instead.
 *
 * @property {(abs1: Timestamp, abs2: Timestamp) => RelativeTime} clampedSubtractAbsAbs
 * The difference between two absolute times is a relative time. If abs1 > abs2
 * the difference would be negative, so this method returns a zero
 * relative time instead.
 *
 * @property {(abs: Timestamp, rel: RelativeTime) => Timestamp} subtractAbsRel
 * An absolute time - a relative time gives a new absolute time
 *
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => RelativeTime} subtractRelRel
 * The difference between two relative times.
 *
 * @property {(rel: RelativeTime) => boolean} isRelZero
 * Does it represent a zero relative time, i.e., the difference
 * of an absolute time with itself? (We choose not to define a similar
 * isAbsZero, even though we could, because it is much less likely to be
 * meaningful.)
 *
 * @property {(rel: RelativeTime, nat: bigint) => RelativeTime} multiplyRelNat
 * @property {(rel: RelativeTime, nat: bigint) => RelativeTime} divideRelNat
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => bigint} divideRelRel
 *
 * @property {(abs: Timestamp, step: RelativeTime) => RelativeTime} modAbsRel
 * An absolute time modulo a relative time is a relative time. For example,
 * 20:17 on July 20, 1969 modulo 1 day is just 20:17, a relative time that
 * can be added to the beginning of any day.
 *
 * @property {(rel: RelativeTime, step: RelativeTime) => RelativeTime} modRelRel
 * A relative time modulo a relative time is a relative time. For example,
 * 3.5 hours modulo an hour is 30 minutes.
 *
 * @property {(abs1: Timestamp, abs2: Timestamp) => RankComparison} compareAbs
 * Compares two absolute times. This comparison function is compatible
 * with JavaScript's `Array.prototype.sort` and so can be used to sort an
 * array of absolute times. The result is -1, 0, or 1 indicating whether
 * the first argument is less than, equal, or greater than the second.
 *
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => RankComparison} compareRel
 * Compares two relative times. This comparison function is compatible
 * with JavaScript's `Array.prototype.sort` and so can be used to sort an
 * array of relative times. The result is -1, 0, or 1 indicating whether
 * the first argument is less than, equal, or greater than the second.
 */
