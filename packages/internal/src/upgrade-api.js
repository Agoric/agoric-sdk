// @ts-check
// @jessie-check
import { isObject } from '@endo/marshal';

/**
 * @typedef {{
 *   name: string;
 *   upgradeMessage: string;
 *   incarnationNumber: number;
 * }} DisconnectionObject
 */

/**
 * Makes an Error-like object for use as the rejection value of promises
 * abandoned by upgrade.
 *
 * @param {string} upgradeMessage
 * @param {number} toIncarnationNumber
 * @returns {DisconnectionObject}
 */
export const makeUpgradeDisconnection = (upgradeMessage, toIncarnationNumber) =>
  harden({
    name: 'vatUpgraded',
    upgradeMessage,
    incarnationNumber: toIncarnationNumber,
  });
harden(makeUpgradeDisconnection);

// TODO: Simplify once we have @endo/patterns (or just export the shape).
// const upgradeDisconnectionShape = harden({
//   name: 'vatUpgraded',
//   upgradeMessage: M.string(),
//   incarnationNumber: M.number(),
// });
// const isUpgradeDisconnection = err => matches(err, upgradeDisconnectionShape);
/**
 * @param {any} err
 * @returns {err is DisconnectionObject}
 */
export const isUpgradeDisconnection = err =>
  isObject(err) &&
  err.name === 'vatUpgraded' &&
  typeof err.upgradeMessage === 'string' &&
  typeof err.incarnationNumber === 'number';
harden(isUpgradeDisconnection);
