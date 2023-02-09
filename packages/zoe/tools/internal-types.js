/**
 * @typedef {object} ManualTimerAdmin
 * @property {(msg?: string) => Promise<void>} tick
 * @property {(nTimes: number, msg?: string) => Promise<void>} tickN
 */

/**
 * @typedef {import('@agoric/time/src/types').TimerService & ManualTimerAdmin} ManualTimer
 */
