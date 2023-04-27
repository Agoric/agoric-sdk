// @jessie-check

/**
 * @typedef {object} ManualTimerAdmin
 * @property {(msg?: string) => void | Promise<void>} tick Advance the timer by one tick.
 * DEPRECATED: use `await tickN(1)` instead.  `tick` function errors might be
 * thrown synchronously, even though success is signaled by returning anything
 * other than a rejected promise.
 * @property {(nTimes: number, msg?: string) => Promise<void>} tickN
 */

/**
 * @typedef {import('@agoric/time/src/types').TimerService & ManualTimerAdmin} ManualTimer
 */
