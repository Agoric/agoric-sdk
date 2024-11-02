/**
 * @import {Zone} from '@agoric/zone';
 * @import {TransactionFeed} from './transaction-feed.js';
 * @import {StatusManager} from './status-manager.js';
 */

import { assertAllDefined } from '@agoric/internal';

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {TransactionFeed} caps.feed
 * @param {StatusManager} caps.statusManager
 */
export const prepareAdvancer = (zone, { feed, statusManager }) => {
  assertAllDefined({ feed, statusManager });
  return zone.exo('Fast USDC Advancer', undefined, {});
};
harden(prepareAdvancer);
