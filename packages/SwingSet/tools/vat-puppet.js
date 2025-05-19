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
 * @param {Parameters<Send>} [finalSend]
 */

/**
 * @callback Send
 * @param {unknown} target
 * @param {string} method
 * @param {...unknown} args
 * @returns {any}
 */

/**
 * @typedef {Array<[name: string, ...args: unknown[]]>} CallLog
 */

/**
 * @param {import('@agoric/swingset-vat').VatPowers} vatPowers
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const makeReflectionMethods = (vatPowers, baggage) => {
  let baggageHoldCount = 0;
  /** @type {Map<object, CallLog>} */
  const callLogsByRemotable = new Map();
  const heldInHeap = [];

  /**
   * @type {Send}
   */
  const send = (target, method, ...args) => E(target)[method](...args);

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

    holdInBaggage: (...values) => {
      for (const value of values) {
        baggage.init(`held-${baggageHoldCount}`, value);
        baggageHoldCount += 1;
      }
      return baggageHoldCount;
    },

    holdInHeap: (...values) => heldInHeap.push(...values),

    makePromiseKit: () => {
      const { promise, ...resolverMethods } = makePromiseKit();
      void promise.catch(() => {});
      const resolver = Far('resolver', resolverMethods);
      return harden({ promise, resolver });
    },

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
      let remotable;

      const makeSpy = (value, name) => {
        const spyName = `get ${name}`;
        const spy = {
          [spyName](...args) {
            let existingLogs = callLogsByRemotable.get(remotable);
            if (!existingLogs) existingLogs = [];
            callLogsByRemotable.set(remotable, [
              ...existingLogs,
              [name, ...args],
            ]);
            return value;
          },
        }[spyName];
        return spy;
      };

      const methods = objectMap(fields, makeSpy);
      remotable = Far(label, { ...methods });
      callLogsByRemotable.set(remotable, /** @type {CallLog} */ ([]));
      return remotable;
    },

    /**
     * @param {object} remotable
     * @returns {CallLog}
     */
    getCallLogForRemotable: remotable =>
      callLogsByRemotable.get(remotable) ||
      Fail`unknown remotable ${q(remotable)}`,
  };
};
harden(makeReflectionMethods);

export function buildRootObject(vatPowers, _vatParameters, baggage) {
  const methods = makeReflectionMethods(vatPowers, baggage);
  return Far('root', methods);
}
