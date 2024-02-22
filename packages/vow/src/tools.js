// @ts-check
import { makeWhen } from './when.js';
import { prepareVowKits } from './vow.js';
import { prepareWatch } from './watch.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.rejectionMeansRetry]
 * @param {(p: PromiseLike<any>, watcher: import('./watch-promise.js').PromiseWatcher, ...args: unknown[]) => void} [powers.watchPromise]
 */
export const prepareVowTools = (zone, powers = {}) => {
  const { rejectionMeansRetry = () => false, watchPromise } = powers;
  const { makeVowKit, providePromiseForVowResolver } = prepareVowKits(
    zone,
    watchPromise,
  );
  const when = makeWhen(
    makeVowKit,
    providePromiseForVowResolver,
    rejectionMeansRetry,
  );
  const watch = prepareWatch(
    zone,
    makeVowKit,
    watchPromise,
    rejectionMeansRetry,
  );
  return harden({ when, watch, makeVowKit });
};
harden(prepareVowTools);
