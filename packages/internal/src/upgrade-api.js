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
  reason != null && // eslint-disable-line eqeqeq
  isFrozen(reason) &&
  matches(reason, UpgradeDisconnectionShape);
harden(isUpgradeDisconnection);

/**
 * Returns whether a reason is a 'vat terminated' error generated when an object
 * is abandoned by a vat during an upgrade.
 *
 * Normally we do not want to rely on the `message` of an error object, but this
 * is a pragmatic solution to the current state of vat upgrade errors. In the
 * future we'd prefer having an error with a cause referencing a disconnection
 * object like for promise rejections. See
 * https://github.com/Agoric/agoric-sdk/issues/9582
 *
 * @param {any} reason
 * @returns {reason is Error}
 */
export const isAbandonedError = reason =>
  reason != null && // eslint-disable-line eqeqeq
  isFrozen(reason) &&
  matches(reason, M.error()) &&
  // We're not using a constant here since this special value is already
  // sprinkled throughout the SDK
  reason.message === 'vat terminated';
harden(isAbandonedError);
