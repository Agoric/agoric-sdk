/**
 * @import {Zone} from '@agoric/zone';
 */

/**
 * @param {Zone} zone
 */
export const prepareStatusManager = zone => {
  return zone.exo('Fast USDC Status Manager', undefined, {});
};
harden(prepareStatusManager);

/** @typedef {ReturnType<typeof prepareStatusManager>} StatusManager */
