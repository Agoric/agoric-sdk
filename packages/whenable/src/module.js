// @ts-check
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { prepareWhen } from './when.js';
import { prepareWhenableKits } from './whenable.js';
import { prepareWatch } from './watch.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.rejectionMeansRetry]
 */
export const prepareWhenableModule = (zone, powers) => {
  const { rejectionMeansRetry = isUpgradeDisconnection } = powers || {};
  const { makeWhenableKit, makeWhenablePromiseKit } = prepareWhenableKits(zone);
  const when = prepareWhen(zone, makeWhenablePromiseKit, rejectionMeansRetry);
  const watch = prepareWatch(zone, makeWhenableKit, rejectionMeansRetry);
  return harden({ watch, when, makeWhenableKit, makeWhenablePromiseKit });
};
harden(prepareWhenableModule);
