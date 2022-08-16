/**
 * @typedef {object} ManualTimerAdmin
 * @property {(msg?: string) => Promise<void>} tick
 * @property {(nTimes: number, msg?: string) => Promise<void>} tickN
 */

/**
 * @typedef { import('@agoric/swingset-vat').ManualTimer } SwingSetManualTimer
 */

/**
 * @typedef {ManualTimerAdmin & SwingSetManualTimer} ManualTimer
 */
