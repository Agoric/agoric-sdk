/**
 * @import {Zone} from '@agoric/zone';
 */

/**
 * @param {Zone} zone
 */
export const prepareTransactionFeed = zone => {
  return zone.exo('Fast USDC Feed', undefined, {});
};
harden(prepareTransactionFeed);

/** @typedef {ReturnType<typeof prepareTransactionFeed>} TransactionFeed */
