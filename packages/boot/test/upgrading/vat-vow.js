import { prepareVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { Far } from '@endo/far';

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const { watch, makeVowKit } = prepareVowTools(zone.subZone('VowTools'));

  /** @typedef {({ status: 'unsettled' } | PromiseSettledResult<any>) & { resolver?: import('@agoric/vow').VowResolver }} WatcherResult */

  /** @type {MapStore<string, WatcherResult>} */
  const nameToResult = zone.mapStore('nameToResult');

  const makeWatcher = zone.exoClass('Watcher', undefined, name => ({ name }), {
    async onFulfilled(value) {
      const { name } = this.state;
      nameToResult.set(name, { status: 'fulfilled', value });
    },
    async onRejected(reason) {
      const { name } = this.state;
      nameToResult.set(name, { status: 'rejected', reason });
    },
  });

  return Far('VowRoot', {
    getWatcherResults() {
      return harden(Object.fromEntries(nameToResult.entries()));
    },
    /** @param {Record<string, [settlementValue?: unknown, isRejection?: boolean]>} localPromises */
    async makeLocalPromiseWatchers(localPromises) {
      for (const [name, settlement] of Object.entries(localPromises)) {
        nameToResult.init(name, harden({ status: 'unsettled' }));
        let p;
        if (!settlement.length) {
          // Never settle.
          p = new Promise(() => {});
        } else {
          const [settlementValue, isRejection] = settlement;
          if (isRejection) {
            p = Promise.reject(settlementValue);
          } else {
            p = Promise.resolve(settlementValue);
          }
        }
        watch(p, makeWatcher(name));
      }
    },
    /** @param {Record<string, [settlementValue?: unknown, isRejection?: boolean, wrapInPromise?: boolean]>} localVows */
    async makeLocalVowWatchers(localVows) {
      for (const [name, settlement] of Object.entries(localVows)) {
        const { vow, resolver } = makeVowKit();
        nameToResult.init(name, harden({ status: 'unsettled', resolver }));
        if (settlement.length) {
          let [settlementValue, isRejection] = settlement;
          const wrapInPromise = settlement[2];
          if (wrapInPromise) {
            if (isRejection) {
              settlementValue = Promise.reject(settlementValue);
              isRejection = false;
            } else if (settlementValue === undefined) {
              // Consider an undefined value as no settlement
              settlementValue = new Promise(() => {});
            } else {
              settlementValue = Promise.resolve(settlementValue);
            }
          }
          if (isRejection) {
            resolver.reject(settlementValue);
          } else {
            resolver.resolve(settlementValue);
          }
        }
        watch(vow, makeWatcher(name));
      }
    },
    /** @param {Record<string, [settlementValue: unknown, isRejection?: boolean]>} localVows */
    async resolveVowWatchers(localVows) {
      for (const [name, settlement] of Object.entries(localVows)) {
        const { status, resolver } = nameToResult.get(name);
        if (status !== 'unsettled' || !resolver) {
          throw Error(`Invalid pending vow for ${name}`);
        }
        const [settlementValue, isRejection] = settlement;
        if (isRejection) {
          resolver.reject(settlementValue);
        } else {
          resolver.resolve(settlementValue);
        }
      }
    },
  });
};
