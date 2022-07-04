/**
 * @typedef {object} ManualTimerAdmin
 * @property {(msg?: string) => ERef<void>} tick
 * @property {(nTimes: number, msg?: string) => ERef<void>} tickN
 */

/**
 * @typedef {ManualTimerAdmin & TimerService} ManualTimer
 */
