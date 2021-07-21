// @ts-check

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeStore } from '@agoric/store';

import './types.js';

/**
 * @returns {NameHubKit}
 */
export const makeNameHubKit = () => {
  /** @typedef {Partial<PromiseRecord<unknown> & { value: unknown }>} NameRecord */
  /** @type {Store<string, NameRecord>} */
  const keyToRecord = makeStore(
    'nameKey',
    { passableOnly: false }, // a promiseKit is not a passable
  );

  /** @type {NameHub} */
  const nameHub = {
    async lookup(...path) {
      if (path.length === 0) {
        return nameHub;
      }
      const [first, ...remaining] = path;
      const record = keyToRecord.get(first);
      /** @type {any} */
      const firstValue = record.promise || record.value;
      if (remaining.length === 0) {
        return firstValue;
      }
      return E(firstValue).lookup(...remaining);
    },
    entries() {
      return keyToRecord
        .entries()
        .map(([key, record]) => [key, record.promise || record.value]);
    },
    values() {
      return keyToRecord.values().map(record => record.promise || record.value);
    },
    keys() {
      return keyToRecord.keys();
    },
  };

  /** @type {NameAdmin} */
  const nameAdmin = {
    reserve(key) {
      assert.typeof(key, 'string');
      if (keyToRecord.has(key)) {
        // If we already have a promise, don't use a new one.
        if (keyToRecord.get(key).promise) {
          return;
        }
        keyToRecord.set(key, makePromiseKit());
      } else {
        keyToRecord.init(key, makePromiseKit());
      }
    },
    update(key, newValue) {
      assert.typeof(key, 'string');
      const record = harden({ value: newValue });
      if (keyToRecord.has(key)) {
        const old = keyToRecord.get(key);
        if (old.resolve) {
          old.resolve(newValue);
        }
        keyToRecord.set(key, record);
      } else {
        keyToRecord.init(key, record);
      }
    },
    delete(key) {
      if (keyToRecord.has(key)) {
        // Reject only if already exists.
        const old = keyToRecord.get(key);
        if (old.reject) {
          old.reject(Error(`Value has been deleted`));
          // Silence unhandled rejections.
          old.promise && old.promise.catch(_ => {});
        }
      }
      // This delete may throw.  Reflect it to callers.
      keyToRecord.delete(key);
    },
  };

  const nameHubKit = {
    nameHub: Far('nameHub', nameHub),
    nameAdmin: Far('nameAdmin', nameAdmin),
  };

  harden(nameHubKit);
  return nameHubKit;
};
