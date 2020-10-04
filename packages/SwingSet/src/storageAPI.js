/**
 * Assert function to ensure that something expected to be a storage object
 * actually implements the storage API.  It should have methods `has`,
 * `getKeys`, `get`, `set`, and `delete`.
 *
 * @param {*} storage  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistStorageAPI(storage) {
  for (const n of ['has', 'getKeys', 'get', 'set', 'delete']) {
    if (!(n in storage)) {
      throw new Error(`storage.${n} is missing, cannot use`);
    }
  }
}

/**
 * Assert function to ensure that something expected to be an enhanced storage
 * object actually implements the enhanced storage API.  It should be a storage
 * object that additionally has the methods `enumeratePrefixedKeys`,
 * `getPrefixedValues`, and `deletePrefixedKeys`.
 *
 * @param {*} storage  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistEnhancedStorageAPI(storage) {
  insistStorageAPI(storage);
  for (const n of [
    'enumeratePrefixedKeys',
    'getPrefixedValues',
    'deletePrefixedKeys',
  ]) {
    if (!(n in storage)) {
      throw new Error(`storage.${n} is missing, cannot use`);
    }
  }
}
