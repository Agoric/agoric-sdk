/* global globalThis */
// @ts-check
import { makeWhen } from './when.js';
import { prepareWhenableKits } from './whenable.js';
import { prepareWatch } from './watch.js';
import makeE from './E.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.rejectionMeansRetry]
 * @param {(p: PromiseLike<any>, watcher: import('./watch.js').PromiseWatcher, ...args: unknown[]) => void} [powers.watchPromise]
 */
export const prepareWhenableModule = (zone, powers) => {
  const { rejectionMeansRetry = () => false, watchPromise } = powers || {};
  const { makeWhenableKit, makeWhenablePromiseKit } = prepareWhenableKits(zone);
  const when = makeWhen(makeWhenablePromiseKit, rejectionMeansRetry);
  const watch = prepareWatch(
    zone,
    makeWhenableKit,
    watchPromise,
    rejectionMeansRetry,
  );
  const E = makeE(
    globalThis.HandledPromise,
    harden({
      unwrap: when,
      additional: { watch },
    }),
  );
  return harden({ E, when, watch, makeWhenableKit });
};
harden(prepareWhenableModule);
