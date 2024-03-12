// @ts-check
import { makeWhen } from './when.js';
import { prepareVowKit } from './vow.js';
import { prepareWatch } from './watch.js';
import { prepareWatchUtils } from './watch-utils.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.isRetryableReason]
 * @param {(p: PromiseLike<any>, watcher: import('./watch-promise.js').PromiseWatcher, ...args: unknown[]) => void} [powers.watchPromise]
 */
export const prepareVowTools = (zone, powers = {}) => {
  const { isRetryableReason = () => false, watchPromise } = powers;
  const makeVowKit = prepareVowKit(zone, watchPromise);
  const when = makeWhen(isRetryableReason);
  const watch = prepareWatch(zone, makeVowKit, watchPromise, isRetryableReason);
  const watchUtils = prepareWatchUtils(zone, watch, makeVowKit);
  return harden({ when, watch, makeVowKit, watchUtils });
};
harden(prepareVowTools);
