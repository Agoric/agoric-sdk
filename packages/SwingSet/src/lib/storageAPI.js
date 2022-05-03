import { assert, details as X } from '@agoric/assert';

/**
 * Assert function to ensure that an object implements the StorageAPI
 * interface: methods { has, getKeys, get, set, delete }
 * (cf. packages/SwingSet/docs/state.md#transactions).
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistStorageAPI(kvStore) {
  for (const n of ['has', 'getKeys', 'get', 'set', 'delete']) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
}

/**
 * Assert function to ensure that an object implements the enhanced storage API.
 * (StorageAPI plus methods { enumeratePrefixedKeys, getPrefixedValues,
 * deletePrefixedKeys }), also known as "KVStorePlus".
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistEnhancedStorageAPI(kvStore) {
  insistStorageAPI(kvStore);
  for (const n of [
    'enumeratePrefixedKeys',
    'getPrefixedValues',
    'deletePrefixedKeys',
  ]) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
}
