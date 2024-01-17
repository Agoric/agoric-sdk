// @ts-check
import { prepareWhen } from './when.js';
import { prepareWhenableKits } from './whenable.js';
import { prepareWatch } from './watch.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.rejectionMeansRetry]
 * @param {(p: PromiseLike<any>, watcher: import('./watch.js').PromiseWatcher, ...args: unknown[]) => void} [powers.watchPromise]
 */
export const prepareWhenableModule = (zone, powers) => {
  const { rejectionMeansRetry = _reason => false, watchPromise } = powers || {};
  const { makeWhenableKit, makeWhenablePromiseKit } = prepareWhenableKits(zone);
  const when = prepareWhen(zone, makeWhenablePromiseKit, rejectionMeansRetry);
  const watch = prepareWatch(
    zone,
    makeWhenableKit,
    watchPromise,
    rejectionMeansRetry,
  );
  return harden({ watch, when, makeWhenableKit, makeWhenablePromiseKit });
};
harden(prepareWhenableModule);
