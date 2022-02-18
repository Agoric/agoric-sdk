import { assert, details as X } from '@agoric/assert';

/**
 * Assert function to ensure that something expected to be a storage object
 * actually implements the storage API.  It should have methods `has`,
 * `getKeys`, `get`, `set`, and `delete`.
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export const insistStorageAPI = kvStore => {
  for (const n of ['has', 'getKeys', 'get', 'set', 'delete']) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
};

/**
 * Assert function to ensure that something expected to be an enhanced storage
 * object actually implements the enhanced storage API.  It should be a storage
 * object that additionally has the methods `enumeratePrefixedKeys`,
 * `getPrefixedValues`, and `deletePrefixedKeys`.
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export const insistEnhancedStorageAPI = kvStore => {
  insistStorageAPI(kvStore);
  for (const n of [
    'enumeratePrefixedKeys',
    'getPrefixedValues',
    'deletePrefixedKeys',
  ]) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
};
