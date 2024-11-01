/**
 * @import {Zone} from '@agoric/zone';
 * @import {StatusManager} from './status-manager.js';
 */

import { assertAllDefined } from '@agoric/internal';

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {StatusManager} caps.statusManager
 */
export const prepareSettler = (zone, { statusManager }) => {
  assertAllDefined({ statusManager });
  return zone.exo('Fast USDC Settler', undefined, {});
};
harden(prepareSettler);
