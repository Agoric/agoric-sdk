// @ts-check
import { prepareWhen } from './when.js';
import { prepareWhenableKit } from './whenable.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.rejectionMeansRetry]
 * @param {WeakMap<object, unknown>} [powers.whenable0ToEphemeral]
 */
export const prepareWhenableModule = (zone, powers) => {
  const { rejectionMeansRetry, whenable0ToEphemeral } = powers || {};
  const makeWhenableKit = prepareWhenableKit(zone, whenable0ToEphemeral);
  const when = prepareWhen(zone, rejectionMeansRetry);
  return harden({ when, makeWhenableKit });
};
harden(prepareWhenableModule);
