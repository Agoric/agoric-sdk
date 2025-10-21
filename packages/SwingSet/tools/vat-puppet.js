/**
 * @file Source code for a vat that exposes reflective methods for use in
 *   testing.
 */

import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { objectMap } from '@agoric/internal';

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

/**
 * @param {import('@agoric/swingset-vat').VatPowers} vatPowers
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {unknown} [vatParameters]
 */
export const makeReflectionMethods = (vatPowers, baggage, vatParameters) => {
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
     * Returns a remotable with methods that return provided values. Invocations
     * of those methods and their arguments are captured for later retrieval by
     * `getCallLogForRemotable`.
     *
     * @param {string} [label]
     * @param {Record<string, any>} [fields]
     */
    makeRemotable: (label = 'Remotable', fields = {}) => {
      /** @type {CallLog} */
      const callLog = [];
      const methods = objectMap(fields, (value, name) =>
        makeSpy(value, name, callLog),
      );
      const remotable = Far(label, { ...methods });
      callLogsByRemotable.set(remotable, callLog);
      return remotable;
    },

    /**
     * @param {object} remotable
     * @returns {CallLog}
     */
    getCallLogForRemotable: remotable =>
      callLogsByRemotable.get(remotable) ||
      Fail`unknown remotable ${q(remotable)}`,

    throw: message => {
      throw Error(message);
    },
  };
};
harden(makeReflectionMethods);

export function buildRootObject(vatPowers, vatParameters, baggage) {
  const methods = makeReflectionMethods(vatPowers, baggage, vatParameters);
  return Far('root', methods);
}
