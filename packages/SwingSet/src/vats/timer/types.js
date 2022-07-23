// @ts-check

/**
 * @typedef {bigint} Timestamp
 * An absolute individual stamp returned by a
 * TimerService.  Note that different timer services may have different
 * interpretations of actual Timestamp values.
 *
 * @typedef {bigint} RelativeTime
 * Difference between two Timestamps.  Note that
 * different timer services may have different interpretations of actual
 * RelativeTime values.
 */

/**
 * @typedef {object} AbsoluteTime
 * @property {TimerService} timerBrand
 * @property {Timestamp} absoluteTimeValue
 */

/**
 * @typedef {object} Duration
 * @property {TimerService} timerBrand
 * @property {RelativeTime} relativeTimeValue
 */

/**
 * @typedef {AbsoluteTime | Timestamp} AbsoluteTimeish
 * Transitional measure until all are converted to AbsoluteTime
 */

/**
 * @typedef {Duration | RelativeTime} Durationish
 * Transitional measure until all are converted to Duration
 */

/**
 * @typedef {object} TimerService
 * Gives the ability to get the current time,
 * schedule a single wake() call, create a repeater that will allow scheduling
 * of events at regular intervals, or remove scheduled calls.
 *
 * @property {() => AbsoluteTimeish} getCurrentTimestamp
 * Retrieve the latest timestamp
 *
 * @property {(baseTime: AbsoluteTimeish,
 *             waker: ERef<TimerWaker>
 * ) => AbsoluteTimeish} setWakeup
 * Return value is the time at which the call is scheduled to take place
 *
 * @property {(waker: ERef<TimerWaker>) => Array<AbsoluteTimeish>} removeWakeup
 * Remove the waker
 * from all its scheduled wakeups, whether produced by `timer.setWakeup(h)` or
 * `repeater.schedule(h)`.
 *
 * @property {(delay: Durationish,
 *             interval: Durationish
 * ) => TimerRepeater} makeRepeater
 * Create and return a repeater that will schedule `wake()` calls
 * repeatedly at times that are a multiple of interval following delay.
 * Interval is the difference between successive times at which wake will be
 * called.  When `schedule(w)` is called, `w.wake()` will be scheduled to be
 * called after the next multiple of interval from the base. Since times can be
 * coarse-grained, the actual call may occur later, but this won't change when
 * the next event will be called.
 *
 * @property {(delay: Durationish,
 *             interval: Durationish
 * ) => Notifier<AbsoluteTimeish>} makeNotifier
 * Create and return a Notifier that will deliver updates repeatedly at times
 * that are a multiple of interval following delay.
 *
 * @property {(delay: Durationish) => Promise<AbsoluteTimeish>} delay
 * Create and return a promise that will resolve after the relative time has
 * passed.
 */

/**
 * @typedef {object} TimerWaker
 *
 * @property {(timestamp: AbsoluteTimeish) => void} wake The timestamp passed to
 * `wake()` is the time that the call was scheduled to occur.
 */

/**
 * @typedef {object} TimerRepeater
 *
 * @property {(waker: ERef<TimerWaker>) => AbsoluteTimeish} schedule
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
 * @property {(abs: AbsoluteTimeish) => Timestamp} absoluteTimeValue
 * @property {(rel: Durationish) => RelativeTime} relativeTimeValue
 * @property {(abs: AbsoluteTimeish, rel: Durationish) => AbsoluteTimeish} addAbsRel
 * @property {(rel1: Durationish, rel2: Durationish) => Durationish} addRelRel
 * @property {(abs1: AbsoluteTimeish, abs2: AbsoluteTimeish) => Durationish} subtractAbsAbs
 * @property {(abs1: AbsoluteTimeish, abs2: AbsoluteTimeish) => Durationish} clampedSubtractAbsAbs
 * @property {(abs: AbsoluteTimeish, rel: Durationish) => AbsoluteTimeish} subtractAbsRel
 * @property {(rel1: Durationish, rel2: Durationish) => Durationish} subtractRelRel
 * @property {(abs: AbsoluteTimeish, step: Durationish) => bigint} modAbsRel
 * @property {(rel: Durationish, step: Durationish) => bigint} modRelRel
 */
