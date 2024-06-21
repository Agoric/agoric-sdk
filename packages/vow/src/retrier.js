import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { heapVowE, prepareVowTools } from '../vat.js';
import { VowShape, toPassableCap } from './vow-utils.js';

/**
 * @import { Zone } from '@agoric/base-zone'
 * @import {VowTools} from './tools.js'
 */

const RetrierI = M.interface('Retrier', {
  retry: M.call().returns(),
  getVow: M.call().returns(VowShape),
  cancel: M.call(M.error()).returns(),
});

const RetrierShape = M.remotable('retrier');

const RetrierAdminI = M.interface('RetrierAdmin', {
  // modeled on getFlowForOutcomeVow
  getRetrierForOutcomeVow: M.call(VowShape).returns(M.opt(RetrierShape)),
});

/**
 * @param {Zone} zone
 * @param {VowTools} [vowTools]
 */
export const prepareRetrierTools = (zone, vowTools = prepareVowTools(zone)) => {
  const { makeVowKit, watch } = vowTools;
  const retrierForOutcomeVowKey = zone.mapStore('retrierForOutcomeVow', {
    keyShape: M.remotable('toPassableCap'),
    valueShape: RetrierShape,
  });

  const makeRetrierKit = zone.exoClassKit(
    'Retrier',
    {
      retrier: RetrierI,
      watcher: PromiseWatcherI,
    },
    (target, optVerb, args) => {
      const { vow, resolver } = makeVowKit();
      return harden({
        target,
        optVerb,
        args,
        vow,
        optResolver: resolver,
      });
    },
    {
      retrier: {
        retry() {
          const { state, facets } = this;
          const { target, optVerb, args, optResolver } = state;
          const { watcher } = facets;

          if (optResolver === undefined) {
            return;
          }
          // TODO `heapVowE` is likely too fragile under upgrade.
          const p = optVerb
            ? heapVowE(target)[optVerb](...args)
            : heapVowE(target)(...args);
          watch(p, watcher);
        },
        getVow() {
          const { state } = this;
          const { vow } = state;
          return vow;
        },
        cancel(reason) {
          const { state } = this;
          if (state.optResolver === undefined) {
            return;
          }
          state.optResolver.resolve(reason);
          state.optResolver = undefined;
        },
      },
      watcher: {
        onFulfilled(value) {
          const { state } = this;

          if (state.optResolver === undefined) {
            return;
          }
          state.optResolver.resolve(value);
          state.optResolver = undefined;
        },
        onRejected(reason) {
          const { state, facets } = this;
          const { retrier } = facets;

          if (state.optResolver === undefined) {
            return;
          }
          if (isUpgradeDisconnection(reason)) {
            // TODO do I need to wait for a new incarnation
            // using isRetryableReason instead?
            retrier.retry();
            return;
          }
          state.optResolver.reject(reason);
          state.optResolver = undefined;
        },
      },
    },
    {
      finish({ state, facets }) {
        const { vow } = state;
        const { retrier } = facets;
        retrier.retry();
        retrierForOutcomeVowKey.init(toPassableCap(vow), retrier);
      },
    },
  );

  const retrierAdmin = zone.exo('retrierAdmin', RetrierAdminI, {
    getRetrierForOutcomeVow(vow) {
      return retrierForOutcomeVowKey.get(toPassableCap(vow));
    },
  });

  const retry = (target, optVerb, args) => {
    const { retrier } = makeRetrierKit(target, optVerb, args);
    return retrier.getVow();
  };

  return harden({
    makeRetrierKit,
    retrierAdmin,
    retry,
  });
};
harden(prepareRetrierTools);
