/**
 * @file Source code for a vat that exposes reflective methods for use in
 *   testing.
 */

import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { objectMap } from '@agoric/internal';
import { M } from '@agoric/store';
import { prepareExoClass, watchPromise } from '@agoric/vat-data';

/**
 * @import {VatPowers} from '@agoric/swingset-vat';
 * @import {Baggage} from '@agoric/vat-data';
 */

/**
 * @callback Die
 * @param {unknown} completion
 * @param {[target: unknown, method: string, ...args: unknown[]]} [finalSend]
 */

/**
 * @callback SetInStore
 * @param {string} key
 * @param {unknown} value
 * @param {{ mode?: 'init' | 'replace' | 'replaceOrInit' }} [options]
 */

/**
 * @typedef {Array<[name: string, ...args: unknown[]]>} CallLog
 */

const PromiseWatcherI = M.interface('PromiseWatcher', {
  onFulfilled: M.call(M.any()).returns(),
  onRejected: M.call(M.any()).returns(),
  getResult: M.call().returns(
    M.or(['unsettled'], [M.or('fulfilled', 'rejected'), M.any()]),
  ),
});
/** @param {unknown} [remoteTarget] */
const initPromiseWatcher = remoteTarget =>
  harden({ remoteTarget, result: ['unsettled'] });
const promiseWatcherMethods = {
  onFulfilled(value) {
    this.state.result = harden(['fulfilled', value]);
    if (!this.state.remoteTarget) return;
    void E(this.state.remoteTarget).onFulfilled(value);
  },
  onRejected(value) {
    this.state.result = harden(['rejected', value]);
    if (!this.state.remoteTarget) return;
    void E(this.state.remoteTarget).onRejected(value);
  },
  getResult() {
    return this.state.result;
  },
};

/**
 * @param {VatPowers} vatPowers
 * @param {Baggage} baggage
 * @param {unknown} [vatParameters]
 */
export const makeReflectionMethods = (vatPowers, baggage, vatParameters) => {
  // Avoid a @agoric/swingset-vat -> @agoric/zone -> @agoric/swingset-vat
  // dependency cycle.
  // const zone = makeDurableZone(baggage);
  // const makePromiseWatcher = zone.exoClass(...);
  const makePromiseWatcher = prepareExoClass(
    baggage,
    'PromiseWatcher',
    PromiseWatcherI,
    initPromiseWatcher,
    promiseWatcherMethods,
  );

  let baggageHoldCount = 0;
  /** @type {Map<object, CallLog>} */
  const callLogsByRemotable = new Map();
  const heldInHeap = [];
  const send = (target, method, ...args) => E(target)[method](...args);
  const makeSpy = (value, name, callLog) => {
    const spyName = `get ${name}`;
    const spy = {
      [spyName](...args) {
        callLog.push([name, ...args]);
        return value;
      },
    }[spyName];
    return spy;
  };

  return {
    baggageHas: key => {
      return baggage.has(key);
    },
    baggageGet: key => {
      return baggage.get(key);
    },
    baggageSet: (key, value) => {
      if (!baggage.has(key)) {
        baggage.init(key, value);
      } else {
        baggage.set(key, value);
      }
    },

    /** @type {Die} */
    dieHappy: (completion, finalSend) => {
      vatPowers.exitVat(completion);
      if (finalSend) send(...finalSend);
    },

    /** @type {Die} */
    dieSad: (reason, finalSend) => {
      vatPowers.exitVatWithFailure(/** @type {Error} */ (reason));
      if (finalSend) send(...finalSend);
    },

    getVatParameters: () => vatParameters,

    holdInBaggage: (...values) => {
      for (const value of values) {
        baggage.init(`held-${baggageHoldCount}`, value);
        baggageHoldCount += 1;
      }
      return baggageHoldCount;
    },

    holdInHeap: (...values) => heldInHeap.push(...values),

    /** @type {SetInStore} */
    setInBaggage: (key, value, { mode = 'replaceOrInit' } = {}) => {
      const exists = baggage.has(key);
      if (mode === 'init' || (mode === 'replaceOrInit' && !exists)) {
        baggage.init(key, value);
      } else if (mode === 'replace' || (mode === 'replaceOrInit' && exists)) {
        baggage.set(key, value);
      } else {
        Fail`unknown mode ${q(mode)}`;
      }
    },

    getFromBaggage: key => baggage.get(key),

    callFromBaggage: (key, methodName, ...args) => {
      const obj = baggage.get(key);
      void E(obj)[methodName](...args);
    },

    makePromiseKit: () => {
      const { promise, ...resolverMethods } = makePromiseKit();
      void promise.catch(() => {});
      const resolver = Far('resolver', resolverMethods);
      return harden({ promise, resolver });
    },

    makeSettledPromise: settlement => Promise.resolve(settlement),

    makeUnsettledPromise() {
      const { promise } = makePromiseKit();
      void promise.catch(() => {});
      return promise;
    },

    /**
     * Return a remotable with a method for each property of an optional object
     * that returns the corresponding property value. Invocations of those
     * methods and their arguments are captured for later retrieval by
     * `getLogForRemotable`.
     *
     * @param {string} [label]
     * @param {Record<string, any>} [methodReturnValues]
     */
    makeRemotable: (label = 'Remotable', methodReturnValues = {}) => {
      /** @type {CallLog} */
      const callLog = [];
      const methods = objectMap(methodReturnValues, (value, name) =>
        makeSpy(value, name, callLog),
      );
      const remotable = Far(label, { ...methods });
      callLogsByRemotable.set(remotable, callLog);
      return remotable;
    },

    /**
     * Return a copy of a remotable's call log.
     *
     * @param {object} remotable
     * @returns {CallLog}
     */
    getLogForRemotable: remotable => {
      const callLog =
        callLogsByRemotable.get(remotable) ||
        Fail`unknown remotable ${q(remotable)}`;
      // Return an immutable copy of the mutable original.
      return harden([...callLog]);
    },

    sendOnly: (target, methodName, ...args) => {
      void E(target)[methodName](...args);
    },

    throw: message => {
      throw Error(message);
    },

    watchSettledPromiseByProxy: (settlement, watcher, ...args) => {
      const watcherProxy = makePromiseWatcher(watcher);
      watchPromise(Promise.resolve(settlement), watcherProxy, ...args);
    },
  };
};
harden(makeReflectionMethods);

export function buildRootObject(vatPowers, vatParameters, baggage) {
  const methods = makeReflectionMethods(vatPowers, baggage, vatParameters);
  const rootObject = Far('root', methods);

  // Invoke specified methods of the new root object *before* returning,
  // supporting use of previous results as top-level arguments by interpreting
  // registered symbols with decimal-integer descriptions as references into an
  // array of previous results.
  const { initialCalls = [] } = vatParameters || {};
  const results = [];
  const decimalIntPatt = /^-?(?:0|[1-9][0-9]*)$/;
  const translateArg = arg => {
    if (typeof arg !== 'symbol' || !Symbol.keyFor(arg)) return arg;
    if (!arg.description?.match(decimalIntPatt)) return arg;
    return results.at(Number(arg.description));
  };
  for (const [methodName, ...args] of initialCalls) {
    const translatedArgs = args.map(translateArg);
    const result = rootObject[methodName](...translatedArgs);
    results.push(result);
  }

  return rootObject;
}
