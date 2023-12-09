/**
 * @file contract that only exits.
 * provides a way to terminate a contract by upgrading it
 * to this implementation.
 *
 * @license Apache-2.0
 */
// @ts-check

/** @param {ZCF} zcf */
export const start = zcf => zcf.shutdown(true);
