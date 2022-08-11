/**
 * @typedef {object} ManualTimerAdmin
 * @property { (when: Timestamp) => void } advanceTo
 */

/**
 * @typedef {ManualTimerAdmin & TimerService} ManualTimer
 */

/**
 * @typedef {object} ManualTimerOptions
 * @property {Timestamp} [startTime=0n]
 */
