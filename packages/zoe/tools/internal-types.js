/**
 * @callback ManualTimerTick
 * @param {string} [msg]
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} ManualTimerAdmin
 * @property {ManualTimerTick} tick
 */

/**
 * @typedef {ManualTimerAdmin & TimerService} ManualTimer
 */
