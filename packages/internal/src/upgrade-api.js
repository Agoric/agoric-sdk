// @ts-check
// @jessie-check

import { M, matches } from '@endo/patterns';

const { isFrozen } = Object;

/**
 * An Error-like object for use as the rejection reason of promises abandoned by
 * upgrade.
 *
 * @typedef {{
 *   name: 'vatUpgraded';
 *   upgradeMessage: string;
 *   incarnationNumber: number;
 * }} UpgradeDisconnection
 */

export const UpgradeDisconnectionShape = harden({
  name: 'vatUpgraded',
  upgradeMessage: M.string(),
  incarnationNumber: M.number(),
});

/**
 * Makes an Error-like object for use as the rejection reason of promises
 * abandoned by upgrade.
 *
 * @param {string} upgradeMessage
 * @param {number} toIncarnationNumber
 * @returns {UpgradeDisconnection}
 */
export const makeUpgradeDisconnection = (upgradeMessage, toIncarnationNumber) =>
  harden({
    name: 'vatUpgraded',
    upgradeMessage,
    incarnationNumber: toIncarnationNumber,
  });
harden(makeUpgradeDisconnection);

/**
 * @param {any} reason If `reason` is not frozen, it cannot be an
 *   UpgradeDisconnection, so returns false without even checking against the
 *   shape.
 * @returns {reason is UpgradeDisconnection}
 */
export const isUpgradeDisconnection = reason =>
  isFrozen(reason) && matches(reason, UpgradeDisconnectionShape);
harden(isUpgradeDisconnection);
