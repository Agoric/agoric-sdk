// @ts-nocheck
import { Far } from '@endo/far';
import { getCopyMapEntries, M } from '@agoric/store';
import { makePromiseKit } from '@endo/promise-kit';
import {
  prepareExo,
  provideDurableMapStore,
  watchPromise,
} from '@agoric/vat-data';

export function buildRootObject(_vatPowers, vatParameters, baggage) {
  const settlements = provideDurableMapStore(baggage, 'settlements');
  const PromiseWatcherI = M.interface('PromiseWatcher', {
    onFulfilled: M.call(M.any(), M.string()).returns(),
    onRejected: M.call(M.any(), M.string()).returns(),
  });
  const watcher = prepareExo(baggage, 'PromiseWatcher', PromiseWatcherI, {
    onFulfilled(value, name) {
      settlements.init(name, harden({ status: 'fulfilled', value }));
    },
    onRejected(reason, name) {
      settlements.init(name, harden({ status: 'rejected', reason }));
    },
  });

  return Far('root', {
    watchLocalPromise: (name, fulfillment, rejection) => {
      const { promise, resolve, reject } = makePromiseKit();
      if (fulfillment !== undefined) {
        resolve(fulfillment);
      } else if (rejection !== undefined) {
        reject(rejection);
      }
      watchPromise(promise, watcher, name);
    },
    getSettlements: () => {
      const settlementsCopyMap = settlements.snapshot();
      return Object.fromEntries(getCopyMapEntries(settlementsCopyMap));
    },
  });
}
