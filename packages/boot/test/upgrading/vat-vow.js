import { prepareVowTools } from '@agoric/vat-data/vow.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { Far } from '@endo/far';

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const { watch } = prepareVowTools(zone.subZone('VowTools'));

  /** @type {MapStore<string, { status: 'unsettled' } | PromiseSettledResult<any>>} */
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
  });
};
