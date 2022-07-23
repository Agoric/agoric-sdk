// @ts-check

/**
 * @typedef {bigint} TimestampValue
 * An absolute individual stamp returned by a
 * TimerService.  Note that different timer services may have different
 * interpretations of actual TimestampValue values.
 *
 * @typedef {bigint} RelativeTimeValue
 * Difference between two Timestamps.  Note that
 * different timer services may have different interpretations of actual
 * RelativeTimeValue values.
 */

/**
 * @typedef {object} TimestampRecord
 * @property {TimerService} timerBrand
 * @property {TimestampValue} absoluteTimeValue
 */

/**
 * @typedef {object} RelativeTimeRecord
 * @property {TimerService} timerBrand
 * @property {RelativeTimeValue} relativeTimeValue
 */

/**
 * @typedef {TimestampRecord | TimestampValue} Timestamp
 * Transitional measure until all are converted to TimestampRecord
 */

/**
 * @typedef {RelativeTimeRecord | RelativeTimeValue} RelativeTime
 * Transitional measure until all are converted to RelativeTimeRecord
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
 * @property {(abs: Timestamp) => TimestampValue} absoluteTimeValue
 * @property {(rel: RelativeTime) => RelativeTimeValue} relativeTimeValue
 * @property {(abs: Timestamp, rel: RelativeTime) => Timestamp} addAbsRel
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => RelativeTime} addRelRel
 * @property {(abs1: Timestamp, abs2: Timestamp) => RelativeTime} subtractAbsAbs
 * @property {(abs1: Timestamp, abs2: Timestamp) => RelativeTime} clampedSubtractAbsAbs
 * @property {(abs: Timestamp, rel: RelativeTime) => Timestamp} subtractAbsRel
 * @property {(rel1: RelativeTime, rel2: RelativeTime) => RelativeTime} subtractRelRel
 * @property {(abs: Timestamp, step: RelativeTime) => bigint} modAbsRel
 * @property {(rel: RelativeTime, step: RelativeTime) => bigint} modRelRel
 */
