// @ts-check

import { assert } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { mapIterable } from '@endo/marshal';
import { makeLegacyMap } from '@agoric/store';

import './types.js';

const { details: X } = assert;

/**
 * @typedef {object} NameHub read-only access to a node in a name hierarchy
 *
 * NOTE: We need to return arrays, not iterables, because even if marshal could
 * allow passing a remote iterable, there would be an inordinate number of round
 * trips for the contents of even the simplest nameHub.
 *
 * @property {(...path: Array<string>) => Promise<any>} lookup Look up a
 * path of keys starting from the current NameHub.  Wait on any reserved
 * promises.
 * @property {() => [string, unknown][]} entries get all the entries
 * available in the current NameHub
 * @property {() => string[]} keys get all names available in the
 * current NameHub
 * @property {() => unknown[]} values get all values available in the
 * current NameHub
 */

/**
 * @typedef {object} NameAdmin write access to a node in a name hierarchy
 *
 * @property {(key: string) => void} reserve Mark a key as reserved; will
 * return a promise that is fulfilled when the key is updated (or rejected when
 * deleted).
 * @property {<T>( key: string, newValue: T, newAdmin?: unknown) =>
 *   T } default Update if not already updated.  Return
 *   existing value, or newValue if not existing.
 * @property {(
 *   key: string, newValue: unknown, newAdmin?: unknown) => void
 * } set Update only if already initialized. Reject if not.
 * @property {(
 *   key: string, newValue: unknown, newAdmin?: unknown) => void
 * } update Fulfill an outstanding reserved promise (if any) to the newValue and
 * set the key to the newValue.  If newAdmin is provided, set that to return via
 * lookupAdmin.
 * @property {(...path: Array<string>) => Promise<any>} lookupAdmin Look up the
 * `newAdmin` from the path of keys starting from the current NameAdmin.  Wait
 * on any reserved promises.
 * @property {(key: string) => void} delete Delete a value and reject an
 * outstanding reserved promise (if any).
 * @property {() => NameHub} readonly get the NameHub corresponding to the
 * current NameAdmin
 * @property {(fn: undefined | ((entries: [string, unknown][]) => void)) => void} onUpdate
 */

/**
 * @typedef {object} NameHubKit a node in a name hierarchy
 * @property {NameHub} nameHub read access
 * @property {NameAdmin} nameAdmin write access
 */

/**
 * Make two facets of a node in a name hierarchy: the nameHub
 * is read access and the nameAdmin is write access.
 *
 * @returns {NameHubKit}
 */
export const makeNameHubKit = () => {
  /** @typedef {Partial<PromiseRecord<unknown> & { value: unknown }>} NameRecord */
  /** @type {LegacyMap<string, NameRecord>} */
  // Legacy because a promiseKit is not a passable
  const keyToRecord = makeLegacyMap('nameKey');

  /** @type {NameHub} */
  const nameHub = Far('nameHub', {
    lookup: async (...path) => {
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
    entries: () => {
      return [
        ...mapIterable(
          keyToRecord.entries(),
          ([key, record]) =>
            /** @type {[string, ERef<unknown>]} */ ([
              key,
              record.promise || record.value,
            ]),
        ),
      ];
    },
    values: () => {
      return [
        ...mapIterable(
          keyToRecord.values(),
          record => record.promise || record.value,
        ),
      ];
    },
    keys: () => {
      return [...keyToRecord.keys()];
    },
  });

  /** @type {LegacyMap<string, NameRecord>} */
  // Legacy because a promiseKit is not a passable
  const keyToAdminRecord = makeLegacyMap('nameKey');
  /** @type {undefined | ((entries: [string, unknown][]) => void)} */
  let updateCallback;
  const updated = () => {
    if (updateCallback) {
      updateCallback(
        harden(
          [
            ...mapIterable(keyToRecord.entries(), ([name, record]) =>
              record.promise
                ? []
                : [/** @type {[string, unknown]} */ ([name, record.value])],
            ),
          ].flat(),
        ),
      );
    }
  };

  /** @type {NameAdmin} */
  const nameAdmin = Far('nameAdmin', {
    reserve: async key => {
      assert.typeof(key, 'string');
      for (const map of [keyToAdminRecord, keyToRecord]) {
        if (!map.has(key)) {
          map.init(key, makePromiseKit());
        }
      }
    },
    default: (key, newValue, adminValue) => {
      assert.typeof(key, 'string');
      if (keyToRecord.has(key)) {
        const record = keyToRecord.get(key);
        if (!record.promise) {
          // Already initalized.
          return /** @type {any} */ (record.value);
        }
      }
      nameAdmin.update(key, newValue, adminValue);
      return newValue;
    },
    set: (key, newValue, adminValue) => {
      assert.typeof(key, 'string');
      let record;
      if (keyToRecord.has(key)) {
        record = keyToRecord.get(key);
      }
      (record && !record.promise) ||
        assert.fail(X`key ${key} is not already initialized`);
      nameAdmin.update(key, newValue, adminValue);
    },
    onUpdate: fn => {
      if (updateCallback) {
        assert(!fn, 'updateCallback accidentally reassigned?');
      }
      updateCallback = fn;
    },
    update: (key, newValue, adminValue) => {
      assert.typeof(key, 'string');
      /** @type {[LegacyMap<string, NameRecord>, unknown][]} */
      const valueMapEntries = [
        [keyToAdminRecord, adminValue], // The optional admin goes in the admin record.
        [keyToRecord, newValue], // The value goes in the normal record.
      ];
      for (const [map, value] of valueMapEntries) {
        const record = harden({ value });
        if (map.has(key)) {
          const old = map.get(key);
          if (old.resolve) {
            old.resolve(value);
          }
          map.set(key, record);
        } else {
          map.init(key, record);
        }
      }
      updated();
    },
    lookupAdmin: async (...path) => {
      if (path.length === 0) {
        return nameAdmin;
      }
      const [first, ...remaining] = path;
      const record = keyToAdminRecord.get(first);
      /** @type {any} */
      const firstValue = record.promise || record.value;
      if (remaining.length === 0) {
        return firstValue;
      }
      return E(firstValue).lookupAdmin(...remaining);
    },
    delete: async key => {
      for (const map of [keyToAdminRecord, keyToRecord]) {
        if (map.has(key)) {
          // Reject only if already exists.
          const old = map.get(key);
          if (old.reject) {
            old.reject(Error(`Value has been deleted`));
            // Silence unhandled rejections.
            old.promise && old.promise.catch(_ => {});
          }
        }
      }
      try {
        // This delete may throw.  Reflect it to callers.
        keyToRecord.delete(key);
      } finally {
        keyToAdminRecord.delete(key);
        updated();
      }
    },
    readonly: () => nameHub,
  });

  const nameHubKit = harden({
    nameHub,
    nameAdmin,
  });
  return nameHubKit;
};
